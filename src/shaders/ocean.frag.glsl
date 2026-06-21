uniform samplerCube uEnvMap;
uniform vec3 uDeepColor;
uniform vec3 uShallowColor;
uniform vec3 uFoamColor;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uCameraPos;
uniform float uTime;
uniform float uFresnelPower;
uniform float uRoughness;
uniform float uExposure;
uniform int uToneMapping;
uniform bool uFoamEnabled;
uniform vec3 uScatteringColor;
uniform vec3 uMoonDir;
uniform vec3 uMoonColor;
uniform float uNightFactor;

varying vec3 vWorldPos;
varying vec3 vNormal;
varying float vJacobian;
varying vec2 vUv;
varying float vDepth;
varying float vFoamIntensity;

#define PI 3.14159265359

float DistributionGGX(vec3 N, vec3 H, float roughness) {
    float a = roughness * roughness;
    float a2 = a * a;
    float NdotH = max(dot(N, H), 0.0);
    float NdotH2 = NdotH * NdotH;
    float nom = a2;
    float denom = (NdotH2 * (a2 - 1.0) + 1.0);
    denom = PI * denom * denom;
    return nom / max(denom, 0.0001);
}

float GeometrySchlickGGX(float NdotV, float roughness) {
    float r = (roughness + 1.0);
    float k = (r * r) / 8.0;
    float nom = NdotV;
    float denom = NdotV * (1.0 - k) + k;
    return nom / denom;
}

float GeometrySmith(vec3 N, vec3 V, vec3 L, float roughness) {
    float NdotV = max(dot(N, V), 0.0);
    float NdotL = max(dot(N, L), 0.0);
    float ggx2 = GeometrySchlickGGX(NdotV, roughness);
    float ggx1 = GeometrySchlickGGX(NdotL, roughness);
    return ggx1 * ggx2;
}

vec3 fresnelSchlick(float cosTheta, vec3 F0) {
    return F0 + (1.0 - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), uFresnelPower);
}

void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(uCameraPos - vWorldPos);
    vec3 L = normalize(uSunDir);
    vec3 H = normalize(V + L);

    float NdotV = max(dot(N, V), 0.0);
    float NdotL = max(dot(N, L), 0.0);

    vec3 F0 = vec3(0.02);
    vec3 F = fresnelSchlick(NdotV, F0);

    vec3 reflectDir = reflect(-V, N);
    vec3 reflectionColor = textureCube(uEnvMap, reflectDir).rgb;

    float depthFactor = vDepth;
    vec3 refractionColor = mix(uShallowColor, uDeepColor, depthFactor);

    float sunViewAngle = max(dot(V, L), 0.0);
    float wavePeakFactor = smoothstep(-0.5, 1.0, vWorldPos.y * 0.5 + 0.5);
    float scatteringAmount = pow(sunViewAngle, 8.0) * wavePeakFactor * 0.6;
    vec3 scattering = uScatteringColor * scatteringAmount;
    refractionColor += scattering;

    vec3 waterColor = mix(refractionColor, reflectionColor, F);

    float D = DistributionGGX(N, H, uRoughness);
    float G = GeometrySmith(N, V, L, uRoughness);
    vec3 specular = D * G * F / max(4.0 * NdotV * NdotL, 0.0001);

    vec3 specularHighlight = specular * uSunColor * NdotL * 3.0;
    waterColor += specularHighlight;

    if (uNightFactor > 0.01) {
        vec3 moonL = normalize(uMoonDir);
        vec3 moonH = normalize(V + moonL);
        float moonNdotL = max(dot(N, moonL), 0.0);
        float moonD = DistributionGGX(N, moonH, uRoughness * 1.5);
        float moonG = GeometrySmith(N, V, moonL, uRoughness * 1.5);
        vec3 moonSpec = moonD * moonG * F / max(4.0 * NdotV * moonNdotL, 0.0001);
        vec3 moonHighlight = moonSpec * uMoonColor * moonNdotL * 2.0;
        waterColor += moonHighlight * uNightFactor;
    }

    if (uFoamEnabled) {
        waterColor = mix(waterColor, uFoamColor, vFoamIntensity);
    }

    vec3 color = waterColor * uExposure;

    if (uToneMapping == 0) {
        color = color / (color + vec3(1.0));
    } else {
        const float a = 2.51;
        const float b = 0.03;
        const float c = 2.43;
        const float d = 0.59;
        const float e = 0.14;
        color = clamp((color * (a * color + b)) / (color * (c * color + d) + e), 0.0, 1.0);
    }

    color = pow(color, vec3(1.0 / 2.2));

    gl_FragColor = vec4(color, 1.0);
}
