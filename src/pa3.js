// src
import './models/spot_triangulated_good.obj';
// pkg
import { vec4, mat4, vec3, vec2 } from 'gl-matrix';

import { Matrix4, Vector2, Vector3, Vector4 } from 'three';
import { OBJLoader } from './js/OBJLoader';

const { cos, sin, tan, PI } = Math;

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let angle = 0;
const frameBuffer = {};
const zBuffer = {};

//视口变换
function get_view_matrix(eye_pos) {
	const view = mat4.create();
	const translate = mat4.fromValues(1, 0, 0, -eye_pos[0], 0, 1, 0, -eye_pos[1], 0, 0, 1, -eye_pos[2], 0, 0, 0, 1);

	return mat4.multiply(mat4.create(), view, translate);
}

//旋转矩阵
function get_model_matrix(rotation_angle, axis) {
	const radian = (rotation_angle * PI) / 180;

	const model = new Matrix4();

	model.makeRotationAxis(axis, radian);

	return model.elements;
}

//透视投影矩阵
function get_projection_matrix(eye_fov, aspect_ratio, zNear, zFar) {
	const n = -Math.abs(zNear);
	const f = -Math.abs(zFar);

	//透视转正交
	const persp2Ortho = mat4.fromValues(n, 0, 0, 0, 0, n, 0, 0, 0, 0, n + f, -n * f, 0, 0, 1, 0);

	const fov = (eye_fov * PI) / 180;

	const t = n * tan(fov / 2);
	const b = -t;
	const r = -t * aspect_ratio;
	const l = -r;

	const trans = mat4.fromValues(1, 0, 0, -(r + l) / 2, 0, 1, 0, -(t + b) / 2, 0, 0, 1, -(n + f) / 2, 0, 0, 0, 1);

	const scale = mat4.fromValues(2 / (r - l), 0, 0, 0, 0, 2 / (t - b), 0, 0, 0, 0, 2 / (n - f), 0, 0, 0, 0, 1);

	const ortho = mat4.multiply(mat4.create(), trans, scale);

	return mat4.multiply(mat4.create(), persp2Ortho, ortho);
}

//光栅化
function rasterize_triangle(t, [r, g, b]) {
	const minX = Math.min(t[0].x, t[1].x, t[2].x);
	const maxX = Math.max(t[0].x, t[1].x, t[2].x);
	const minY = Math.min(t[0].y, t[1].y, t[2].y);
	const maxY = Math.max(t[0].y, t[1].y, t[2].y);

	for (let x = minX; x <= maxX; x++) {
		for (let y = minY; y <= maxY; y++) {
			if (insideTriangle(x + 0.5, y + 0.5, t)) {
				const { z } = t[0];

				if (!zBuffer[`${x}_${y}`]) zBuffer[`${x}_${y}`] = -Infinity;

				if (z > zBuffer[`${x}_${y}`]) {
					ctx.fillStyle = `rgba(${r},${g},${b},1)`;
					ctx.beginPath();
					ctx.arc(x, y, 1, 0, 2 * Math.PI);
					ctx.closePath();
					ctx.fill();

					zBuffer[`${x}_${y}`] = z;
					frameBuffer[`${x}_${y}`] = [r, g, b];
				}
			}
		}
	}
}

let a = 1;
// 判断点是否在三角形
function insideTriangle(x, y, t) {
	const P = [x, y];

	const A = [t[0].x, t[0].y];
	const B = [t[1].x, t[1].y];
	const C = [t[2].x, t[2].y];

	const AP = vec3.sub([], P, A);
	const BP = vec3.sub([], P, B);
	const CP = vec3.sub([], P, C);
	const AB = vec3.sub([], B, A);
	const BC = vec3.sub([], C, B);
	const CA = vec3.sub([], A, C);

	const eq1 = AB[0] * AP[1] - AB[1] * AP[0];
	const eq2 = BC[0] * BP[1] - BC[1] * BP[0];
	const eq3 = CA[0] * CP[1] - CA[1] * CP[0];

	if (eq1 > 0 && eq2 > 0 && eq3 > 0) return true;
	else if (eq1 < 0 && eq2 < 0 && eq3 < 0) return true;

	return false;
}

function normal_fragment_shader(v) {
	const color = new Vector3(v.x, v.y, v.z).add(new Vector3(1, 1, 1)).divideScalar(2);
	// console.log(color.x / 255, color.y / 255, color.z / 255);
	return [color.x * 255, color.y * 255, color.z * 255];
}

function main(angle = 90, axis = new Vector3(0, 1, 0)) {
	const eye_pos = [0, 0, 5];

	const model = get_model_matrix(angle, axis);
	const view = get_view_matrix(eye_pos);
	const projection = get_projection_matrix(45, 1, 0.1, 50);

	const mvp = mat4.multiply(mat4.create(), model, mat4.multiply(mat4.create(), view, projection));

	const f1 = (50 - 0.1) / 2.0;
	const f2 = (50 + 0.1) / 2.0;

	const loader = new OBJLoader();

	loader.load('./models/spot_triangulated_good.obj', (materials) => {
		const mesh = materials.children[0];
		const { geometry } = mesh;

		//顶点
		const position = geometry.attributes.position.array;
		let position_v4 = [];

		//法线
		const normal = geometry.attributes.normal.array;
		const normal_v4 = [];
		const color3 = [];

		for (let i = 0; i < position.length; i += 3) {
			// mvp变换
			let [x, y, z, w] = ve4MultiplyMat4([], [position[i], position[i + 1], position[i + 2], 1], mvp);

			color3[i] = normal_fragment_shader(new Vector3(x, y, z));

			// 坐标转换-1到1之间
			x /= w;
			y /= w;
			z /= w;

			// 转换屏幕坐标
			x = 0.5 * 700 * (x + 1.0);
			y = 0.5 * 700 * (y + 1.0);
			z = z * f1 * f2;

			position_v4.push(new Vector4(x, y, z, w));
		}

		position_v4 = position_v4
			.map((n, i) => {
				if (i % 3 === 0) {
					return [n, position_v4[i + 1], position_v4[i + 2]];
				}
			})
			.filter((n) => n);

		if (canvas) {
			ctx.clearRect(0, 0, 700, 700);

			for (let i = 0; i < position_v4.length; i++) {
				rasterize_triangle(position_v4[i], color3[i * 3]);
			}
		}
	});
}

main();

document.addEventListener('keydown', (e) => {
	if (e.code === 'ArrowRight') {
		angle -= 1;
		main(angle, new Vector3(0, 1, 0));
	}
	if (e.code === 'ArrowUp') {
		angle -= 1;
		main(angle, new Vector3(1, 0, 0));
	}
	if (e.code === 'ArrowDown') {
		angle -= 1;
		main(angle, new Vector3(0, 0, 1));
	}
});

document.body.append('shader');

function ve4MultiplyMat4(out, a, m) {
	var x = a[0],
		y = a[1],
		z = a[2],
		w = a[3];
	out[0] = x * m[0] + y * m[1] + z * m[2] + w * m[3];
	out[1] = x * m[4] + y * m[5] + z * m[6] + w * m[7];
	out[2] = x * m[8] + y * m[9] + z * m[10] + w * m[11];
	out[3] = x * m[12] + y * m[13] + z * m[14] + w * m[15];

	return out;
}
