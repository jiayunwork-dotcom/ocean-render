import * as THREE from 'three';

const GRAVITY = 9.81;

interface Complex {
  re: Float32Array;
  im: Float32Array;
}

function createComplexArray(size: number): Complex {
  return {
    re: new Float32Array(size),
    im: new Float32Array(size),
  };
}

function bitReverse(n: number, bits: number): number {
  let reversed = 0;
  for (let i = 0; i < bits; i++) {
    reversed = (reversed << 1) | (n & 1);
    n >>= 1;
  }
  return reversed;
}

function bitReversePermute(data: Complex, N: number): void {
  const bits = Math.log2(N);
  for (let i = 0; i < N; i++) {
    const j = bitReverse(i, bits);
    if (i < j) {
      let temp = data.re[i];
      data.re[i] = data.re[j];
      data.re[j] = temp;
      temp = data.im[i];
      data.im[i] = data.im[j];
      data.im[j] = temp;
    }
  }
}

function fft1D(data: Complex, N: number, inverse: boolean): void {
  bitReversePermute(data, N);

  for (let s = 1; s <= Math.log2(N); s++) {
    const m = 1 << s;
    const mHalf = m >> 1;
    const sign = inverse ? 1 : -1;
    const wmRe = Math.cos((sign * 2 * Math.PI) / m);
    const wmIm = Math.sin((sign * 2 * Math.PI) / m);

    for (let k = 0; k < N; k += m) {
      let wRe = 1;
      let wIm = 0;

      for (let j = 0; j < mHalf; j++) {
        const tRe = wRe * data.re[k + j + mHalf] - wIm * data.im[k + j + mHalf];
        const tIm = wRe * data.im[k + j + mHalf] + wIm * data.re[k + j + mHalf];

        const uRe = data.re[k + j];
        const uIm = data.im[k + j];

        data.re[k + j] = uRe + tRe;
        data.im[k + j] = uIm + tIm;
        data.re[k + j + mHalf] = uRe - tRe;
        data.im[k + j + mHalf] = uIm - tIm;

        const wReNew = wRe * wmRe - wIm * wmIm;
        const wImNew = wRe * wmIm + wIm * wmRe;
        wRe = wReNew;
        wIm = wImNew;
      }
    }
  }

  if (inverse) {
    const invN = 1 / N;
    for (let i = 0; i < N; i++) {
      data.re[i] *= invN;
      data.im[i] *= invN;
    }
  }
}

function ifft2D(data: Complex, N: number): void {
  const row: Complex = createComplexArray(N);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      row.re[x] = data.re[y * N + x];
      row.im[x] = data.im[y * N + x];
    }
    fft1D(row, N, true);
    for (let x = 0; x < N; x++) {
      data.re[y * N + x] = row.re[x];
      data.im[y * N + x] = row.im[x];
    }
  }

  const col: Complex = createComplexArray(N);
  for (let x = 0; x < N; x++) {
    for (let y = 0; y < N; y++) {
      col.re[y] = data.re[y * N + x];
      col.im[y] = data.im[y * N + x];
    }
    fft1D(col, N, true);
    for (let y = 0; y < N; y++) {
      data.re[y * N + x] = col.re[y];
      data.im[y * N + x] = col.im[y];
    }
  }
}

function gaussianRandom(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export class OceanFFT {
  private N: number;
  private size: number;
  private renderer: THREE.WebGLRenderer;

  private h0: Complex;
  private h0Conj: Complex;
  private omega: Float32Array;
  private kx: Float32Array;
  private kz: Float32Array;
  private kLen: Float32Array;

  private hTime: Complex;
  private dxSpectrum: Complex;
  private dzSpectrum: Complex;
  private heightField: Float32Array;
  private dxField: Float32Array;
  private dzField: Float32Array;

  private heightMap: THREE.DataTexture;
  private gradientMap: THREE.DataTexture;
  private jacobianMap: THREE.DataTexture;

  private heightData: Float32Array;
  private gradientData: Float32Array;
  private jacobianData: Float32Array;

  private prevWindSpeed: number = -1;
  private prevWindDirX: number = -1;
  private prevWindDirZ: number = -1;

  constructor(renderer: THREE.WebGLRenderer, N: number = 64, size: number = 200) {
    this.N = N;
    this.size = size;
    this.renderer = renderer;

    if ((N & (N - 1)) !== 0) {
      throw new Error('N must be a power of 2');
    }

    const N2 = N * N;

    this.h0 = createComplexArray(N2);
    this.h0Conj = createComplexArray(N2);
    this.omega = new Float32Array(N2);
    this.kx = new Float32Array(N2);
    this.kz = new Float32Array(N2);
    this.kLen = new Float32Array(N2);

    this.hTime = createComplexArray(N2);
    this.dxSpectrum = createComplexArray(N2);
    this.dzSpectrum = createComplexArray(N2);
    this.heightField = new Float32Array(N2);
    this.dxField = new Float32Array(N2);
    this.dzField = new Float32Array(N2);

    this.heightData = new Float32Array(N2 * 4);
    this.gradientData = new Float32Array(N2 * 4);
    this.jacobianData = new Float32Array(N2 * 4);

    this.heightMap = this.createDataTexture(this.heightData);
    this.gradientMap = this.createDataTexture(this.gradientData);
    this.jacobianMap = this.createDataTexture(this.jacobianData);

    this.precomputeWaves();
  }

  private createDataTexture(data: Float32Array): THREE.DataTexture {
    const texture = new THREE.DataTexture(
      data,
      this.N,
      this.N,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    texture.needsUpdate = true;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    return texture;
  }

  private precomputeWaves(): void {
    const N = this.N;
    const L = this.size;
    const N2 = N * N;

    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const idx = y * N + x;
        const nx = x < N / 2 ? x : x - N;
        const nz = y < N / 2 ? y : y - N;

        this.kx[idx] = (2 * Math.PI * nx) / L;
        this.kz[idx] = (2 * Math.PI * nz) / L;
        this.kLen[idx] = Math.sqrt(this.kx[idx] * this.kx[idx] + this.kz[idx] * this.kz[idx]);
        this.omega[idx] = Math.sqrt(GRAVITY * this.kLen[idx]);
      }
    }
  }

  private phillipsSpectrum(
    kx: number,
    kz: number,
    kLen: number,
    windSpeed: number,
    windDirX: number,
    windDirZ: number
  ): number {
    if (kLen < 0.0001) return 0;

    const L = (windSpeed * windSpeed) / GRAVITY;
    const kDotW = kx * windDirX + kz * windDirZ;
    const k2 = kLen * kLen;
    const k4 = k2 * k2;

    const A = 8.0;

    let spectrum = (A * Math.exp(-1 / (k2 * L * L)) * kDotW * kDotW) / k4;

    const lambda = 0.0001;
    spectrum *= Math.exp(-k2 * lambda * lambda);

    return spectrum;
  }

  private computeH0(windSpeed: number, windDirX: number, windDirZ: number): void {
    const N = this.N;
    const N2 = N * N;

    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const idx = y * N + x;

        const kx = this.kx[idx];
        const kz = this.kz[idx];
        const kLen = this.kLen[idx];

        const P = this.phillipsSpectrum(kx, kz, kLen, windSpeed, windDirX, windDirZ);
        const amplitude = Math.sqrt(P / 2);

        const xiR = gaussianRandom();
        const xiI = gaussianRandom();

        this.h0.re[idx] = xiR * amplitude;
        this.h0.im[idx] = xiI * amplitude;

        const nx = x < N / 2 ? x : x - N;
        const nz = y < N / 2 ? y : y - N;
        const mx = -nx;
        const mz = -nz;
        const xm = (mx + N) % N;
        const ym = (mz + N) % N;
        const idxM = ym * N + xm;

        const kxM = this.kx[idxM];
        const kzM = this.kz[idxM];
        const kLenM = this.kLen[idxM];
        const PM = this.phillipsSpectrum(kxM, kzM, kLenM, windSpeed, windDirX, windDirZ);
        const amplitudeM = Math.sqrt(PM / 2);

        this.h0Conj.re[idx] = xiR * amplitudeM;
        this.h0Conj.im[idx] = -xiI * amplitudeM;
      }
    }
  }

  update(
    windSpeed: number,
    windDirection: number,
    time: number
  ): {
    heightMap: THREE.DataTexture;
    gradientMap: THREE.DataTexture;
    jacobianMap: THREE.DataTexture;
  } {
    const windDirX = Math.cos(windDirection);
    const windDirZ = Math.sin(windDirection);

    if (
      Math.abs(windSpeed - this.prevWindSpeed) > 0.01 ||
      Math.abs(windDirX - this.prevWindDirX) > 0.01 ||
      Math.abs(windDirZ - this.prevWindDirZ) > 0.01
    ) {
      this.computeH0(windSpeed, windDirX, windDirZ);
      this.prevWindSpeed = windSpeed;
      this.prevWindDirX = windDirX;
      this.prevWindDirZ = windDirZ;
    }

    const N = this.N;
    const N2 = N * N;

    for (let i = 0; i < N2; i++) {
      const omegaT = this.omega[i] * time;
      const cosT = Math.cos(omegaT);
      const sinT = Math.sin(omegaT);

      const hRe = this.h0.re[i] * cosT - this.h0.im[i] * sinT;
      const hIm = this.h0.re[i] * sinT + this.h0.im[i] * cosT;

      const hConjRe = this.h0Conj.re[i] * cosT + this.h0Conj.im[i] * sinT;
      const hConjIm = -this.h0Conj.re[i] * sinT + this.h0Conj.im[i] * cosT;

      this.hTime.re[i] = hRe + hConjRe;
      this.hTime.im[i] = hIm + hConjIm;

      const k2 = this.kLen[i] * this.kLen[i];
      if (k2 > 0.0001) {
        const invK2 = 1 / k2;
        const negKx = -this.kx[i] * invK2;
        const negKz = -this.kz[i] * invK2;
        this.dxSpectrum.re[i] = this.hTime.im[i] * negKx;
        this.dxSpectrum.im[i] = this.hTime.re[i] * this.kx[i] * invK2;
        this.dzSpectrum.re[i] = this.hTime.im[i] * negKz;
        this.dzSpectrum.im[i] = this.hTime.re[i] * this.kz[i] * invK2;
      } else {
        this.dxSpectrum.re[i] = 0;
        this.dxSpectrum.im[i] = 0;
        this.dzSpectrum.re[i] = 0;
        this.dzSpectrum.im[i] = 0;
      }
    }

    ifft2D(this.hTime, N);
    ifft2D(this.dxSpectrum, N);
    ifft2D(this.dzSpectrum, N);

    for (let i = 0; i < N2; i++) {
      this.heightField[i] = this.hTime.re[i];
      this.dxField[i] = this.dxSpectrum.re[i];
      this.dzField[i] = this.dzSpectrum.re[i];
    }

    this.fillTextures();

    this.heightMap.needsUpdate = true;
    this.gradientMap.needsUpdate = true;
    this.jacobianMap.needsUpdate = true;

    return {
      heightMap: this.heightMap,
      gradientMap: this.gradientMap,
      jacobianMap: this.jacobianMap,
    };
  }

  private fillTextures(): void {
    const N = this.N;

    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const idx = y * N + x;
        const pixelIdx = idx * 4;

        const xm = (x - 1 + N) % N;
        const xp = (x + 1) % N;
        const ym = (y - 1 + N) % N;
        const yp = (y + 1) % N;

        const idxL = y * N + xm;
        const idxR = y * N + xp;
        const idxU = ym * N + x;
        const idxD = yp * N + x;

        const h = this.heightField[idx];
        const hL = this.heightField[idxL];
        const hR = this.heightField[idxR];
        const hU = this.heightField[idxU];
        const hD = this.heightField[idxD];

        const inv2Dx = N / (2 * this.size);
        const dhdx = (hR - hL) * inv2Dx;
        const dhdz = (hD - hU) * inv2Dx;

        const dxL = this.dxField[idxL];
        const dxR = this.dxField[idxR];
        const dxU = this.dxField[idxU];
        const dxD = this.dxField[idxD];
        const dDxdx = (dxR - dxL) * inv2Dx;
        const dDxdz = (dxD - dxU) * inv2Dx;

        const dzL = this.dzField[idxL];
        const dzR = this.dzField[idxR];
        const dzU = this.dzField[idxU];
        const dzD = this.dzField[idxD];
        const dDzdx = (dzR - dzL) * inv2Dx;
        const dDzdz = (dzD - dzU) * inv2Dx;

        const jacobian = (1 + dDxdx) * (1 + dDzdz) - dDxdz * dDzdx;

        this.heightData[pixelIdx] = h;
        this.heightData[pixelIdx + 1] = dhdx;
        this.heightData[pixelIdx + 2] = dhdz;
        this.heightData[pixelIdx + 3] = jacobian;

        const len = Math.sqrt(dhdx * dhdx + dhdz * dhdz + 1);
        this.gradientData[pixelIdx] = -dhdx / len;
        this.gradientData[pixelIdx + 1] = 1.0 / len;
        this.gradientData[pixelIdx + 2] = -dhdz / len;
        this.gradientData[pixelIdx + 3] = 1.0;

        this.jacobianData[pixelIdx] = jacobian;
        this.jacobianData[pixelIdx + 1] = this.dxField[idx];
        this.jacobianData[pixelIdx + 2] = this.dzField[idx];
        this.jacobianData[pixelIdx + 3] = 1.0;
      }
    }
  }

  dispose(): void {
    this.heightMap.dispose();
    this.gradientMap.dispose();
    this.jacobianMap.dispose();
  }
}
