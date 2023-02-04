import { Vector2, Vector3 } from 'three';

class Shader {
	color: Vector3 = new Vector3();
	normal: Vector3 = new Vector3();
	viewPos: Vector3 = new Vector3();
	texCoords: Vector2 = new Vector2();

	constructor(color: Vector3, normal: Vector3, texCoords: Vector2, viewPos: Vector3) {
		this.color = color;
		this.normal = normal;
		this.texCoords = texCoords;
		this.viewPos = viewPos;
	}
}

export default Shader;
