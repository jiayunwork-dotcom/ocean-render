uniform sampler2D uNoiseTex;
uniform float uTime;

varying vec2 vUv;
varying float vParticleAge;

void main() {
    vec2 uv = vUv;

    float noiseScale = 2.0;
    vec2 noiseUv = uv * noiseScale + vec2(uTime * 0.1, uTime * 0.05);
    float noise = texture2D(uNoiseTex, noiseUv).r;

    float distToCenter = length(uv - 0.5) * 2.0;
    float softEdge = 1.0 - smoothstep(0.5, 1.0, distToCenter);

    float foamPattern = noise * softEdge;

    float ageFade = 1.0 - vParticleAge;
    ageFade = smoothstep(0.0, 0.3, ageFade);

    float alpha = foamPattern * ageFade;

    vec3 foamColor = vec3(1.0, 1.0, 1.0);

    gl_FragColor = vec4(foamColor, alpha);
}
