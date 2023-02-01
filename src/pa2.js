import { vec4, mat4, vec3 } from 'gl-matrix/esm/index.js';

const { cos, sin, tan, PI } = Math;

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const frameBuffer = {};
const zBuffer = {};

//视口变换
function get_view_matrix(eye_pos) {
	const view = mat4.create();
	const translate = mat4.fromValues(1, 0, 0, -eye_pos[0], 0, 1, 0, -eye_pos[1], 0, 0, 1, -eye_pos[2], 0, 0, 0, 1);

	return mat4.multiply(mat4.create(), view, translate);
}

//旋转矩阵
function get_model_matrix(rotation_angle) {
	const radian = (rotation_angle * PI) / 180;
	// Create the model matrix for rotating the triangle around the Z axis
	const model = mat4.fromValues(cos(radian), -sin(radian), 0, 0, sin(radian), cos(radian), 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
	return model;
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
	for (let x = 0; x < canvas.height; x++) {
		for (let y = 0; y < canvas.width; y++) {
			if (insideTriangle(x, y, t)) {
				const [, , z] = t[0];

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

// 判断点是否在三角形
function insideTriangle(x, y, v) {
	const P = [x, y];

	const A = v[0];
	const B = v[1];
	const C = v[2];

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

function main(angle = 0) {
	const eye_pos = [0, 0, 5];

	const model = get_model_matrix(angle);
	const view = get_view_matrix(eye_pos);
	const projection = get_projection_matrix(45, 1, 0.1, 50);

	const mvp = mat4.multiply(mat4.create(), model, mat4.multiply(mat4.create(), view, projection));

	const v = [
		[vec4.fromValues(2, 0, -2, 1), vec4.fromValues(0, 2, -2, 1), vec4.fromValues(-2, 0, -2, 1)],
		[vec4.fromValues(3.5, -1, -5, 1), vec4.fromValues(2.5, 1.5, -5, 1), vec4.fromValues(-1, 0.5, -5, 1)],
	];

	const f1 = (50 - 0.1) / 2.0;
	const f2 = (50 + 0.1) / 2.0;

	for (let i = 0; i < v.length; i++) {
		for (let j = 0; j < v[i].length; j++) {
			// mpv变换
			let [x, y, z, w] = ve4MultiplyMat4(vec4.create(), v[i][j], mvp);
			// 坐标转换-1到1之间

			x /= w;
			y /= w;
			z /= w;
			// 转换屏幕坐标
			x = 0.5 * 700 * (x + 1.0);
			y = 0.5 * 700 * (y + 1.0);
			z = z * f1 * f2;

			v[i][j] = vec4.fromValues(x, y, z, w);
		}
	}

	if (canvas) {
		ctx.clearRect(0, 0, 700, 700);
		const color = [
			[217.0, 238.0, 185.0],
			[185.0, 217.0, 238.0],
		];

		for (let i = 0; i < v.length; i++) {
			const [r, g, b] = color[i];
			rasterize_triangle(v[i], color[i]);
		}
	}
}

main();

document.body.append('z-buffer');

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
