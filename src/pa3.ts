// src
import './models/spot_triangulated_good.obj';
// pkg
import { Matrix4, Vector2, Vector3, Vector4 } from 'three';
//@ts-ignore
import { OBJLoader } from './js/OBJLoader.js';
import Triangle from './Triangle';
import Rasterizer from './Rasterizer';
import Shader from './Shader';

const { cos, sin, tan, PI } = Math;

//model
function get_model_matrix(rotation_angle: number) {
	const radian = (rotation_angle * PI) / 180;

	const rotation = new Matrix4().set(cos(radian), 0, sin(radian), 0, 0, 1, 0, 0, -sin(radian), 0, cos(radian), 0, 0, 0, 0, 1).transpose();
	const scale = new Matrix4().set(2.5, 0, 0, 0, 0, 2.5, 0, 0, 0, 0, 2.5, 0, 0, 0, 0, 1).transpose();
	const translate = new Matrix4().set(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1).transpose();

	return scale.multiply(rotation).multiply(translate);
}

//view
function get_view_matrix(eye_pos: Vector3) {
	const view = new Matrix4();
	const translate = new Matrix4().set(1, 0, 0, -eye_pos.x, 0, 1, 0, -eye_pos.y, 0, 0, 1, -eye_pos.z, 0, 0, 0, 1).transpose();
	return view.multiply(translate);
}

//projection
function get_projection_matrix(eye_fov: number, aspect_ratio: number, zNear: number, zFar: number) {
	const n = zNear;
	const f = zFar;

	const fov = (eye_fov * PI) / 180;
	const t = n * tan(fov / 2);
	const b = -t;
	const r = t * aspect_ratio;
	const l = -r;

	//透视转正交
	const persp2Ortho = new Matrix4().set(n, 0, 0, 0, 0, n, 0, 0, 0, 0, n + f, -n * f, 0, 0, 1, 0).transpose();

	const trans = new Matrix4().set(1, 0, 0, -(r + l) / 2, 0, 1, 0, -(t + b) / 2, 0, 0, 1, -(n + f) / 2, 0, 0, 0, 1).transpose();

	const scale = new Matrix4().set(2 / (r - l), 0, 0, 0, 0, 2 / (t - b), 0, 0, 0, 0, 2 / (n - f), 0, 0, 0, 0, 1).transpose();

	return persp2Ortho.multiply(scale.multiply(trans));
}

function normal_fragment_shader(payload: Shader) {
	const returnColor = payload.normal.normalize().add(new Vector3(1, 1, 1)).divideScalar(2);
	return new Vector3(returnColor.x * 255, returnColor.y * 255, returnColor.z * 255);
}

function vertexShader(payload: any) {
	return payload.position;
}

function main() {
	const loader = new OBJLoader();
	const angle = -50;
	const triangleList: Triangle[] = [];

	loader.load('./models/spot_triangulated_good.obj', (materials: any) => {
		const mesh = materials.children[0];
		//@ts-ignore
		const count = mesh.geometry.attributes.position.count;
		const position = mesh.geometry.attributes.position.array;
		const normal = mesh.geometry.attributes.normal.array;
		const uv = mesh.geometry.attributes.uv.array;

		for (let i = 0; i < count; i += 3) {
			const t = new Triangle();
			for (let j = 0; j < 9; j += 3) {
				t.setVertex(new Vector4(position[i * 3 + j], position[i * 3 + j + 1], position[i * 3 + j + 2]));
				t.setNormals(new Vector3(normal[i * 3 + j], normal[i * 3 + j + 1], normal[i * 3 + j + 2]));
			}
			for (let k = 0; k < 2; k++) {
				t.setTexCoord(new Vector2(uv[i * 2 + k], uv[i * 2 + k]));
			}
			triangleList.push(t);
		}

		const r = new Rasterizer(700, 700);
		const eye_pos = new Vector3(0, 0, 10);

		let activeShader = normal_fragment_shader;

		r.setVertexShader(vertexShader);
		r.setFragmentShader(activeShader);
		r.clear();
		r.setModel(get_model_matrix(angle));
		r.setView(get_view_matrix(eye_pos));
		r.setProjection(get_projection_matrix(45, 1, 0.1, 50));
		r.draw(triangleList);
	});
}

main();
