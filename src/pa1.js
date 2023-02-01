import { vec4, mat4 } from 'gl-matrix/esm/index.js';

const { cos, sin, tan, PI } = Math;

let angle = 0;
const canvas = document.getElementById('canvas');

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
	const n = zNear;
	const f = zFar;

	//透视转正交
	const persp2Ortho = mat4.fromValues(n, 0, 0, 0, 0, n, 0, 0, 0, 0, n + f, -n * f, 0, 0, 1, 0);

	const fov = (eye_fov * PI) / 180;

	const t = -n * tan(fov / 2);
	const b = -t;
	const r = t * aspect_ratio;
	const l = -r;

	const trans = mat4.fromValues(1, 0, 0, -(r + l) / 2, 0, 1, 0, -(t + b) / 2, 0, 0, 1, -(n + f) / 2, 0, 0, 0, 1);

	const scale = mat4.fromValues(2 / (r - l), 0, 0, 0, 0, 2 / (t - b), 0, 0, 0, 0, 2 / (n - f), 0, 0, 0, 0, 1);

	const ortho = mat4.multiply(mat4.create(), trans, scale);

	return mat4.multiply(mat4.create(), persp2Ortho, ortho);
}

function main(angle = 0) {
	const eye_pos = [0, 0, 5];

	const model = get_model_matrix(angle);
	const view = get_view_matrix(eye_pos);
	const projection = get_projection_matrix(45, 1, 0.1, 50);

	const mvp = mat4.multiply(mat4.create(), model, mat4.multiply(mat4.create(), view, projection));

	const v = [vec4.fromValues(2, 0, -2, 1), vec4.fromValues(0, 2, -2, 1), vec4.fromValues(-2, 0, -2, 1)];

	const f1 = (100 - 0.1) / 2.0;
	const f2 = (100 + 0.1) / 2.0;

	for (let i = 0; i < v.length; i++) {
		// mpv变换
		v[i] = ve4MultiplyMat4(vec4.create(), v[i], mvp);
		// 坐标转换-1到1之间
		v[i] = v[i].map((n) => n / v[i][3]);
		// 转换屏幕坐标
		v[i][0] = 0.5 * 700 * (v[i][0] + 1.0);
		v[i][1] = 0.5 * 700 * (v[i][1] + 1.0);
		v[i][2] = v[i][2] * f1 * f2;
	}

	if (canvas) {
		const ctx = canvas.getContext('2d');
		ctx.clearRect(0, 0, 700, 700);
		for (let j = 0; j < v.length; j++) {
			const [curX, curY] = v[j];
			const [nexX, nexY] = v[(j + 1) % 3 === 0 ? (j + 1) / 3 - 1 : j + 1];
			ctx.beginPath();
			ctx.strokeStyle = 'blue';
			ctx.lineWidth = 1;
			ctx.moveTo(curX, curY);
			ctx.lineTo(nexX, nexY);
			ctx.stroke();
		}
	}
}

document.addEventListener('keydown', (e) => {
	console.log(angle);

	if (e.code === 'ArrowRight') {
		angle += 1;
		main(angle);
	}

	if (e.code === 'ArrowLeft') {
		angle -= 1;
		main(angle);
	}
});

main();

document.body.append('mvp变换 arrowRight切换角度');

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
