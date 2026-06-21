uniform float uTime;
uniform float uSize;
uniform float uWindSpeed;
uniform vec2 uWindDir;
uniform float uChoppyFactor;
uniform float uDisplacementScale;
uniform sampler2D uHeightMap;
uniform sampler2D uGradientMap;
uniform sampler2D uJacobianMap;
uniform int uShipCount;
uniform vec2 uShipPositions[3];
uniform float uShipHeadings[3];
uniform float uShipSpeeds[3];
uniform bool uWakeEnabled;

varying vec3 vWorldPos;
varying vec3 vNormal;
varying float vJacobian;
varying vec2 vUv;
varying float vDepth;
varying float vFoamIntensity;

#define KELVIN_ANGLE 0.340339204
#define WAVE_NUMBER 9.81
#define PI 3.14159265359

float kelvinWakeHeight(vec2 pos, vec2 shipPos, float shipHeading, float shipSpeed) {
    vec2 toPoint = pos - shipPos;
    float dist = length(toPoint);
    if (dist < 0.01) return 0.0;

    vec2 forward = vec2(cos(shipHeading), sin(shipHeading));
    float alongTrack = dot(toPoint, forward);
    if (alongTrack < 0.0) return 0.0;

    vec2 perp = vec2(-forward.y, forward.x);
    float crossTrack = abs(dot(toPoint, perp));

    float maxCross = alongTrack * tan(KELVIN_ANGLE);
    if (crossTrack > maxCross) return 0.0;

    float angle = atan(crossTrack, alongTrack);
    float theta = KELVIN_ANGLE - angle;

    float U = max(shipSpeed, 0.5);
    float k = WAVE_NUMBER / (U * U);

    float transversePhase = k * alongTrack * (1.0 + cos(2.0 * angle));
    float divergentPhase = k * alongTrack * (1.0 - cos(2.0 * theta));

    float amp = 1.0 / sqrt(max(dist, 1.0));
    amp *= smoothstep(0.0, 5.0, alongTrack);
    amp *= smoothstep(maxCross, maxCross * 0.7, crossTrack);

    float transverse = sin(transversePhase - uTime * U * k) * 0.5;
    float divergent = sin(divergentPhase - uTime * U * k * 0.5) * 0.5;

    float wakeAmp = U * 0.15;
    return (transverse + divergent) * amp * wakeAmp;
}

void main() {
    vUv = uv;

    vec3 pos = position * uSize;

    vec4 heightSample = texture2D(uHeightMap, uv);
    vec4 gradientSample = texture2D(uGradientMap, uv);
    vec4 jacobianSample = texture2D(uJacobianMap, uv);

    float height = heightSample.r * uDisplacementScale;
    vec2 gradient = gradientSample.rg * uDisplacementScale;
    float jacobian = jacobianSample.r;

    vec2 horizontalDisp = -gradient * uChoppyFactor;
    pos.xz += horizontalDisp;
    pos.y += height;

    if (uWakeEnabled) {
        float wakeHeight = 0.0;
        float wakeFoam = 0.0;
        for (int i = 0; i < 3; i++) {
            if (i >= uShipCount) break;
            float wh = kelvinWakeHeight(pos.xz, uShipPositions[i], uShipHeadings[i], uShipSpeeds[i]);
            wakeHeight += wh;
            wakeFoam += smoothstep(0.02, 0.15, abs(wh));
        }
        pos.y += wakeHeight;
        vFoamIntensity = clamp(wakeFoam, 0.0, 1.0);
    } else {
        vFoamIntensity = 0.0;
    }

    vFoamIntensity += smoothstep(-0.3, 0.0, -jacobian) * 0.8;
    vFoamIntensity = clamp(vFoamIntensity, 0.0, 1.0);

    vNormal = normalize(vec3(-gradient.r, 1.0, -gradient.g));

    vJacobian = jacobian;
    vWorldPos = pos;
    vDepth = clamp(1.0 - (pos.y + 5.0) / 20.0, 0.0, 1.0);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
