import * as THREE from 'three'

import { SVGResult } from 'three/examples/jsm/Addons.js'
import { RawShaderMaterial } from './core/ExtendedMaterials'
import vertexShader from './shader/point.vs'
import fragmentShader from './shader/point.fs'

export class Char {
  private readonly division = 300
  private readonly scale = 0.01

  private startIndex = 0
  private endIndex = 0
  private elapsedTime = 0

  span = 50
  animationSpeed = 50
  edge1PathTargets: string[] = []
  edge2PathTargets: string[] = []

  readonly mesh: THREE.Points<THREE.BufferGeometry, RawShaderMaterial>

  constructor(
    private source: SVGResult,
    public readonly name: string,
    position: [number, number],
    private animationOffset = 0,
  ) {
    this.mesh = this.create(position)
  }

  private create(position?: [number, number]) {
    const posX = position?.[0] ?? 0
    const posY = position?.[1] ?? 0

    const points: THREE.Vector2[] = []

    let sum = 0
    for (const path of this.source.paths) {
      sum += path.currentPath?.getLength() ?? 0
    }

    for (const path of this.source.paths) {
      if (path.currentPath) {
        const ratio = path.currentPath?.getLength() / sum
        points.push(...path.currentPath.getSpacedPoints(Math.ceil(this.division * ratio)))
      }
    }

    const geo = new THREE.BufferGeometry()

    const vertices: number[] = []
    const visibles: number[] = []

    for (let i = 0; i < points.length; i++) {
      const current = points[i]
      const next = points[(i + 1) % points.length]
      if (0.01 < current.clone().sub(next).length()) {
        vertices.push((current.x + posX) * this.scale, (-current.y + this.height * 0.5 + posY) * this.scale, 0)
        visibles.push(1)
      }
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    geo.setAttribute('visible', new THREE.Int32BufferAttribute(visibles, 1).setUsage(THREE.DynamicDrawUsage))

    const mat = new RawShaderMaterial({
      uniforms: {},
      vertexShader,
      fragmentShader,
      transparent: true,
      glslVersion: '300 es',
    })

    const mesh = new THREE.Points(geo, mat)
    mesh.name = this.name
    return mesh
  }

  get width() {
    return (this.source.xml as any).width.baseVal.value as number
  }

  get height() {
    return (this.source.xml as any).height.baseVal.value as number
  }

  get edge1(): [number, number] {
    const position = this.mesh.geometry.getAttribute('position')
    return [position.array[this.startIndex * 3 + 0], position.array[this.startIndex * 3 + 1]]
  }

  get edge2(): [number, number] {
    const position = this.mesh.geometry.getAttribute('position')
    return [position.array[this.endIndex * 3 + 0], position.array[this.endIndex * 3 + 1]]
  }

  update(dt: number) {
    this.elapsedTime += dt * this.animationSpeed
    const progress = Math.ceil(this.elapsedTime + this.animationOffset)

    const attrVisible = this.mesh.geometry.getAttribute('visible')
    const len = attrVisible.array.length
    this.startIndex = progress % len
    this.endIndex = (progress + Math.ceil(this.span)) % len

    for (let i = 0; i < len; i++) {
      if (this.startIndex < this.endIndex) {
        if (this.startIndex <= i && i <= this.endIndex) {
          attrVisible.array[i] = 0
        } else {
          attrVisible.array[i] = 1
        }
      } else {
        if (this.startIndex <= i || i <= this.endIndex) {
          attrVisible.array[i] = 0
        } else {
          attrVisible.array[i] = 1
        }
      }
    }

    attrVisible.needsUpdate = true
  }
}
