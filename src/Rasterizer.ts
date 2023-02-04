import { vec2, vec3 } from 'gl-matrix';
import { Vector4, Matrix4, Vector2, Vector3, Vector2Tuple } from 'three';
import Shader from './Shader';
import Triangle from './Triangle';

class Rasterizer {
	// canva
	width = 0;
	height = 0;
	ctx: CanvasRenderingContext2D | undefined = undefined;

	// mvp
	model = new Matrix4();
	view = new Matrix4();
	projection = new Matrix4();

	// shader
	vertexShader: Function = () => {};
	fragmentShader: Function = () => {};

	// buffer
	depth_buf: {
		[key: string]: number;
	} = {};

	constructor(width: number, height: number) {
		if (!this.ctx) {
			this.width = width;
			this.height = height;
			this.createScene();
		}
	}

	setModel(m: Matrix4) {
		this.model = m;
	}

	setView(v: Matrix4) {
		this.view = v;
	}

	setProjection(p: Matrix4) {
		this.projection = p;
	}

	setVertexShader(vertex_shader_payload: Function) {
		this.vertexShader = vertex_shader_payload;
	}

	setFragmentShader(frag_shader: Function) {
		this.fragmentShader = frag_shader;
	}

	setPixel(x: number, y: number, color: Vector3) {
		if (this.ctx) {
			this.ctx.fillStyle = `rgb(${color.x},${color.y},${color.z})`;
			this.ctx.beginPath();
			this.ctx.arc(x, y, 1, 0, 2 * Math.PI);
			this.ctx.closePath();
			this.ctx.fill();
		}
	}

	insideTriangle(x: number, y: number, v: Vector4[]) {
		const P = new Vector2(x, y);
		const A = new Vector2(v[0].x, v[0].y);
		const B = new Vector2(v[1].x, v[1].y);
		const C = new Vector2(v[2].x, v[2].y);

		const AP = P.clone().sub(A);
		const BP = P.clone().sub(B);
		const CP = P.clone().sub(C);
		const AB = B.clone().sub(A);
		const BC = C.clone().sub(B);
		const CA = A.clone().sub(C);

		const eq1 = AB.x * AP.y - AB.y * AP.x;
		const eq2 = BC.x * BP.y - BC.y * BP.x;
		const eq3 = CA.x * CP.y - CA.y * CP.x;

		if (eq1 > 0 && eq2 > 0 && eq3 > 0) return true;
		else if (eq1 < 0 && eq2 < 0 && eq3 < 0) return true;
		return false;
	}

	rasterizeTriangle(t: Triangle, viewPos: Vector3[]) {
		const v = t.toVector4();

		const minX = Math.floor(Math.min(v[0].x, v[1].x, v[2].x));
		const maxX = Math.ceil(Math.max(v[0].x, v[1].x, v[2].x));
		const minY = Math.floor(Math.min(v[0].y, v[1].y, v[2].y));
		const maxY = Math.ceil(Math.max(v[0].y, v[1].y, v[2].y));

		const pos = [
			[0.25, 0.25],
			[0.75, 0.25],
			[0.25, 0.75],
			[0.75, 0.75],
		];

		for (let x = minX; x <= maxX; x++) {
			for (let y = minY; y <= maxY; y++) {
				// msaa
				let count = 0;
				for (let MSAA_4 = 0; MSAA_4 < 4; MSAA_4++) {
					if (this.insideTriangle(x + pos[MSAA_4][0], y + pos[MSAA_4][1], v)) {
						++count;
					}
				}
				if (count) {
					const [alpha, beta, gamma] = this.computeBarycentric2D(x + 0.5, y + 0.5, t.v);

					const Z = 1.0 / (alpha / v[0].w + beta / v[1].w + gamma / v[2].w);
					let zp = (alpha * v[0].z) / v[0].w + (beta * v[1].z) / v[1].w + (gamma * v[2].z) / v[2].w;
					zp *= Z;

					if (!this.depth_buf[this.getIndex(x, y)]) this.depth_buf[this.getIndex(x, y)] = -Infinity;

					if (zp > this.depth_buf[this.getIndex(x, y)]) {
						this.depth_buf[this.getIndex(x, y)] = zp;
						const interpolated_color = this.interpolate(alpha, beta, gamma, t.color[0], t.color[1], t.color[2], 1) as Vector3;
						const interpolated_normal = this.interpolate(alpha, beta, gamma, t.normal[0], t.normal[1], t.normal[2], 1) as Vector3;
						const interpolated_texcoords = this.interpolate(alpha, beta, gamma, t.texCoord[0], t.texCoord[1], t.texCoord[2], 1) as Vector2;
						const interpolated_shadingcoords = this.interpolate(alpha, beta, gamma, viewPos[0], viewPos[1], viewPos[2], 1) as Vector3;
						// console.log(interpolated_texcoords);

						const payload = new Shader(interpolated_color, interpolated_normal.normalize(), interpolated_texcoords, interpolated_shadingcoords);

						const pixelColor = this.fragmentShader(payload);

						this.setPixel(x, y, pixelColor);
					}
				}
			}
		}
	}

	draw(triangleList: Triangle[]) {
		const f1 = (50 - 0.1) / 2.0;
		const f2 = (50 + 0.1) / 2.0;

		const mvp = this.model.clone().multiply(this.view.clone()).multiply(this.projection);

		for (let i = 0; i < triangleList.length; i++) {
			const t = triangleList[i];
			const newtri = new Triangle();

			// 计算 viewpace
			const viewspace_pos = [];
			for (let i = 0; i < 3; i++) {
				const { x: tx, y: ty, z: tz } = t.v[i].clone().applyMatrix4(this.model).applyMatrix4(this.view);
				viewspace_pos.push(new Vector3(tx, ty, tz));
			}

			//mvp变换
			const v: Vector4[] = [this.ve4MultiplyMat4(t.v[0], mvp), this.ve4MultiplyMat4(t.v[1], mvp), this.ve4MultiplyMat4(t.v[2], mvp)];
			for (let vi = 0; vi < v.length; vi++) {
				v[vi].x /= v[vi].w;
				v[vi].y /= v[vi].w;
				v[vi].z /= v[vi].w;

				v[vi].x = 0.5 * this.width * (v[vi].x + 1.0);
				v[vi].y = 0.5 * this.height * (v[vi].y + 1.0);
				v[vi].z = v[vi].z * f1 + f2;

				newtri.setVertex(v[vi]);
			}

			const inv_trans = this.model.clone().multiply(this.view.clone()).invert().transpose();
			const n = [new Vector4(t.normal[0].x, t.normal[0].y, t.normal[0].z, 0).applyMatrix4(inv_trans), new Vector4(t.normal[1].x, t.normal[1].y, t.normal[1].z, 0).applyMatrix4(inv_trans), new Vector4(t.normal[2].x, t.normal[2].y, t.normal[2].z, 0).applyMatrix4(inv_trans)];

			for (let i = 0; i < 3; i++) {
				newtri.setNormals(new Vector3(n[i].x, n[i].y, n[i].z));
			}

			for (let i = 0; i < 2; i++) {
				newtri.setTexCoord(new Vector2(t.texCoord[i].x, t.texCoord[i].y));
			}

			newtri.setColor(148, 121.0, 92.0);
			newtri.setColor(148, 121.0, 92.0);
			newtri.setColor(148, 121.0, 92.0);

			this.rasterizeTriangle(newtri, viewspace_pos);
		}
	}

	drawDot(t: Triangle) {
		const v = t.toVector4();
		for (let i = 0; i < v.length; i++) {
			const { x, y } = v[i];
			if (this.ctx) {
				this.ctx.fillStyle = `white`;
				this.ctx.beginPath();
				this.ctx.arc(x, y, 1, 0, 2 * Math.PI);
				this.ctx.closePath();
				this.ctx.fill();
			}
		}
	}

	drawFace(t: Triangle) {
		const v = t.toVector4();
		for (let j = 0; j < v.length; j++) {
			if (!this.ctx) continue;
			const { x, y } = v[j];
			const { x: nextX, y: nextY } = v[(j + 1) % 3 === 0 ? (j + 1) / 3 - 1 : j + 1];
			this.ctx.beginPath();
			this.ctx.strokeStyle = 'white';
			this.ctx.lineWidth = 1;
			this.ctx.moveTo(x, y);
			this.ctx.lineTo(nextX, nextY);
			this.ctx.stroke();
		}
	}

	clear() {
		this.ctx?.clearRect(0, 0, this.width, this.height);
	}

	getIndex(x: number, y: number) {
		return `${x}_${y}`;
	}

	ve4MultiplyMat4(v4: Vector4, m4: Matrix4) {
		const x = v4.x;
		const y = v4.y;
		const z = v4.z;
		const w = v4.w;

		const X = x * m4.elements[0] + y * m4.elements[1] + z * m4.elements[2] + w * m4.elements[3];
		const Y = x * m4.elements[4] + y * m4.elements[5] + z * m4.elements[6] + w * m4.elements[7];
		const Z = x * m4.elements[8] + y * m4.elements[9] + z * m4.elements[10] + w * m4.elements[11];
		const W = x * m4.elements[12] + y * m4.elements[13] + z * m4.elements[14] + w * m4.elements[15];

		return new Vector4(X, Y, Z, W);
	}

	computeBarycentric2D(x: number, y: number, v: Vector4[]) {
		const c1 = (x * (v[1].y - v[2].y) + (v[2].x - v[1].x) * y + v[1].x * v[2].y - v[2].x * v[1].y) / (v[0].x * (v[1].y - v[2].y) + (v[2].x - v[1].x) * v[0].y + v[1].x * v[2].y - v[2].x * v[1].y);
		const c2 = (x * (v[2].y - v[0].y) + (v[0].x - v[2].x) * y + v[2].x * v[0].y - v[0].x * v[2].y) / (v[1].x * (v[2].y - v[0].y) + (v[0].x - v[2].x) * v[1].y + v[2].x * v[0].y - v[0].x * v[2].y);
		const c3 = (x * (v[0].y - v[1].y) + (v[1].x - v[0].x) * y + v[0].x * v[1].y - v[1].x * v[0].y) / (v[2].x * (v[0].y - v[1].y) + (v[1].x - v[0].x) * v[2].y + v[0].x * v[1].y - v[1].x * v[0].y);
		return [c1, c2, c3];
	}

	interpolate(alpha: number, beta: number, gamma: number, vert1: Vector3 | Vector2, vert2: Vector3 | Vector2, vert3: Vector3 | Vector2, weight: number) {
		//@ts-ignore
		if (vert1.isVector3) {
			//@ts-ignore
			return vert1.clone().multiplyScalar(alpha).add(vert2.clone().multiplyScalar(beta)).add(vert3.clone().multiplyScalar(gamma)).divideScalar(weight);
		}

		//@ts-ignore
		if (vert1.isVector2) {
			//@ts-ignore
			let u = alpha * vert1[0] + beta * vert2[0] + gamma * vert3[0];
			//@ts-ignore
			let v = alpha * vert1[1] + beta * vert2[1] + gamma * vert3[1];

			u /= weight;
			v /= weight;

			return new Vector2(u, v);
		}
	}

	private createScene() {
		const canvas = document.createElement('canvas');
		canvas.width = this.width;
		canvas.height = this.height;
		canvas.style.background = 'black';
		document.body.append(canvas);
		this.ctx = canvas.getContext('2d')!;
	}
}

export default Rasterizer;
