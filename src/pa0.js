import { vec3, mat3 } from 'gl-matrix/esm/index.js';

const { cos, sin, PI } = Math;

let P = vec3.fromValues(2, 1, 1);

const sina = sin((45 / 180) * PI);
const cosa = cos((45 / 180) * PI);

const R = mat3.fromValues(cosa, -sina, 0, sina, cosa, 0, 0, 0, 1);

const T = mat3.fromValues(1, 0, 1, 0, 1, 2, 0, 0, 1);

P = ve3MultiplyMat3(vec3.create(), P, mat3.mul(mat3.create(), R, T));

function ve3MultiplyMat3(out, a, m) {
	var x = a[0],
		y = a[1],
		z = a[2];
	out[0] = x * m[0] + y * m[1] + z * m[2];
	out[1] = x * m[3] + y * m[4] + z * m[5];
	out[2] = x * m[6] + y * m[7] + z * m[8];

	return out;
}
