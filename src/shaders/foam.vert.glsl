attribute float aParticleAge;

varying vec2 vUv;
varying float vParticleAge;

void main() {
    vUv = uv;
    vParticleAge = aParticleAge;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = 30.0 * (1.0 - aParticleAge);
    gl_Position = projectionMatrix * mvPosition;
}
