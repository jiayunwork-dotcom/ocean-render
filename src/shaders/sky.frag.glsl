uniform vec3 uSunDir;
uniform float uSunElevation;
uniform int uPreset;
uniform float uTime;

varying vec2 vUv;
varying vec3 vWorldPos;

#define PI 3.14159265359

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                        -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
    m = m*m;
    m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
}

float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    for (int i = 0; i < 5; i++) {
        value += amplitude * snoise(p * frequency);
        amplitude *= 0.5;
        frequency *= 2.0;
    }
    return value;
}

vec3 rayleighScattering(vec3 dir, vec3 sunDir) {
    float sunDot = max(dot(dir, sunDir), 0.0);
    float rayleigh = pow(1.0 - max(dot(dir, vec3(0.0, 1.0, 0.0)), 0.0), 4.0);
    vec3 skyColor;
    if (uPreset == 0) {
        skyColor = mix(vec3(0.3, 0.6, 1.0), vec3(0.1, 0.3, 0.8), rayleigh);
    } else if (uPreset == 1) {
        skyColor = mix(vec3(0.6, 0.65, 0.7), vec3(0.4, 0.45, 0.5), rayleigh);
    } else {
        float t = clamp(uSunElevation, 0.0, 1.0);
        vec3 horizonColor = mix(vec3(1.0, 0.4, 0.1), vec3(0.1, 0.05, 0.2), 1.0 - t);
        vec3 zenithColor = mix(vec3(0.8, 0.3, 0.2), vec3(0.05, 0.02, 0.15), 1.0 - t);
        skyColor = mix(horizonColor, zenithColor, rayleigh);
    }
    vec3 sunColor = vec3(1.0, 0.95, 0.8);
    float sunIntensity = pow(sunDot, 8.0);
    skyColor += sunColor * sunIntensity * 0.3;
    return skyColor;
}

float sunDisc(vec3 dir, vec3 sunDir) {
    float angle = acos(dot(dir, sunDir));
    float disc = smoothstep(0.02, 0.015, angle);
    float glow = smoothstep(0.15, 0.02, angle) * 0.5;
    return disc + glow;
}

float cloudLayer(vec2 uv, float time) {
    vec2 p = uv * 2.0 + vec2(time * 0.01, 0.0);
    float clouds = fbm(p);
    clouds = smoothstep(0.0, 0.5, clouds);
    return clouds;
}

void main() {
    vec3 dir = normalize(vWorldPos);
    vec3 sunDir = normalize(uSunDir);

    vec3 color = rayleighScattering(dir, sunDir);

    float sun = sunDisc(dir, sunDir);
    vec3 sunDiscColor;
    if (uPreset == 2) {
        sunDiscColor = mix(vec3(1.0, 0.6, 0.2), vec3(1.0, 0.9, 0.7), clamp(uSunElevation, 0.0, 1.0));
    } else {
        sunDiscColor = vec3(1.0, 0.98, 0.9);
    }
    color += sunDiscColor * sun;

    if (uPreset == 1 || uPreset == 0) {
        float cloudAmount = (uPreset == 1) ? 0.8 : 0.25;
        vec2 cloudUv = dir.xz / max(dir.y, 0.1) * 0.5;
        float clouds = cloudLayer(cloudUv, uTime) * cloudAmount;
        clouds *= smoothstep(0.0, 0.2, dir.y);
        vec3 cloudColor = mix(vec3(0.9, 0.9, 0.95), color, 0.3);
        color = mix(color, cloudColor, clouds);
    }

    if (uPreset == 2) {
        float horizonFactor = 1.0 - abs(dir.y);
        vec3 sunsetHaze = mix(vec3(1.0, 0.3, 0.0), vec3(0.5, 0.1, 0.2), 1.0 - clamp(uSunElevation, 0.0, 1.0));
        color = mix(color, sunsetHaze, pow(horizonFactor, 3.0) * 0.6);
    }

    color = pow(color, vec3(1.0 / 2.2));

    gl_FragColor = vec4(color, 1.0);
}
