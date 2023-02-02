import { mat4 } from 'gl-matrix';
import { Vector4, Matrix4, Vector2, Vector3 } from 'three';
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

	insideTriangle(x: number, y: number, v: Vector4[]) {
		const P = new Vector2(x, y);
		const A = new Vector2(v[0].x, v[0].y);
		const B = new Vector2(v[1].x, v[1].y);
		const C = new Vector2(v[2].x, v[2].y);

		const AP = P.sub(A);
		const BP = P.sub(B);
		const CP = P.sub(C);
		const AB = B.sub(A);
		const BC = C.sub(B);
		const CA = A.sub(C);

		const eq1 = AB.x * AP.y - AB.y * AP.x;
		const eq2 = BC.x * BP.y - BC.y * BP.x;
		const eq3 = CA.x * CP.y - CA.y * CP.x;

		if (eq1 > 0 && eq2 > 0 && eq3 > 0) return true;
		else if (eq1 < 0 && eq2 < 0 && eq3 < 0) return true;

		return false;
	}

	rasterizeTriangle(t: Triangle, viewPos: Vector3) {
		const v = t.toVector4();

		const minX = Math.min(v[0].x, v[1].x, v[2].x);
		const maxX = Math.max(v[0].x, v[1].x, v[2].x);
		const minY = Math.min(v[0].y, v[1].y, v[2].y);
		const maxY = Math.max(v[0].y, v[1].y, v[2].y);

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

		// for (let x = minX; x <= maxX; x++) {
		// 	for (let y = minY; y <= maxY; y++) {
		// 		if (this.insideTriangle(x, y, v)) {
		// 			const z = v[0].z;
		// 			const { x: r, y: g, z: b } = t.color[0];

		// 			if (!this.depth_buf[this.getIndex(x, y)]) this.depth_buf[this.getIndex(x, y)] = -Infinity;

		// 			if (z > this.depth_buf[this.getIndex(x, y)] && this.ctx) {
		// 				this.depth_buf[this.getIndex(x, y)] = z;

		// 				this.ctx.fillStyle = `white`;
		// 				this.ctx.beginPath();
		// 				this.ctx.arc(x, y, 1, 0, 2 * Math.PI);
		// 				this.ctx.closePath();
		// 				this.ctx.fill();
		// 			}
		// 		}
		// 	}
		// }
	}

	draw(triangleList: Triangle[]) {
		const f1 = (50 - 0.1) / 2.0;
		const f2 = (50 + 0.1) / 2.0;

		//@ts-ignore
		const mvp = this.model.multiply(this.view.multiply(this.projection));

		console.log(mvp);

		for (let i = 0; i < triangleList.length; i++) {
			const t = triangleList[i];
			const newtri = new Triangle();

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

			const inv_trans = this.view.multiply(this.model).invert().transpose();
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

			const viewspace_pos = new Vector3();

			this.rasterizeTriangle(newtri, viewspace_pos);
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
