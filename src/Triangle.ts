import { Vector2, Vector3, Vector4 } from 'three';

class Triangle {
	v: Vector4[] = [];
	normal: Vector3[] = [];
	color: Vector3[] = [];
	texCoord: Vector2[] = [];

	constructor() {}

	a() {
		return this.v[0];
	}

	b() {
		return this.v[1];
	}

	c() {
		return this.v[2];
	}

	toVector4() {
		return this.v;
	}

	setVertex(vec4: Vector4) {
		this.v.push(vec4);
	}

	setNormals(vec3: Vector3) {
		this.normal.push(vec3);
	}

	setTexCoord(vec2: Vector2) {
		this.texCoord.push(vec2);
	}

	setColors(uv: Vector3) {
		this.color.push(uv);
	}

	setColor(r: number, g: number, b: number) {
		this.color.push(new Vector3(r, g, b));
	}
}

export default Triangle;
