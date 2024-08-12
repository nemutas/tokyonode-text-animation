import * as THREE from 'three'
import { OrthographicCamera } from './core/Camera'
import { Three } from './core/Three'
import { SVGLoader, SVGResult } from 'three/examples/jsm/Addons.js'
import { Char } from './Char'
import gsap from 'gsap'

export class Canvas extends Three {
  private readonly camera: OrthographicCamera
  private charGroup!: THREE.Group
  private line!: THREE.LineSegments<THREE.BufferGeometry>

  private chars: Char[] = []
  private charsInfo: { svg: string; name: string }[] = [
    { svg: 'T', name: 'T' },
    { svg: 'O', name: 'O1' },
    { svg: 'K', name: 'K' },
    { svg: 'Y', name: 'Y' },
    { svg: 'O', name: 'O2' },
    { svg: 'N', name: 'N' },
    { svg: 'O', name: 'O3' },
    { svg: 'D', name: 'D' },
    { svg: 'E', name: 'E' },
  ]

  constructor(canvas: HTMLCanvasElement) {
    super(canvas)
    this.camera = new OrthographicCamera({ scale: 2 })
    this.init()

    this.load().then(() => {
      this.charGroup = this.createChars()
      this.line = this.createLines()

      this.gsapAnimation()

      window.addEventListener('resize', this.resize.bind(this))
      this.renderer.setAnimationLoop(this.anime.bind(this))
    })
  }

  private init() {
    this.scene.background = new THREE.Color('#fff')
  }

  private svgMap: { [key in string]: SVGResult } = {}

  private async load() {
    const loader = new SVGLoader()
    await Promise.all(
      ['T', 'O', 'K', 'Y', 'N', 'D', 'E'].map(async (fileName) => {
        this.svgMap[fileName] = await loader.loadAsync(import.meta.env.BASE_URL + `/svg/${fileName}.svg`)
      }),
    )
  }

  private createChars() {
    const group = new THREE.Group()
    this.scene.add(group)

    let posX = 0
    const gap = 20

    for (const { svg, name } of this.charsInfo) {
      const char = new Char(this.svgMap[svg], name, [posX, 0], Math.random() * 1000)
      group.add(char.mesh)
      this.chars.push(char)
      posX += char.width + gap
    }

    group.position.x = -(posX - gap) * 0.01 * 0.5
    return group
  }

  private createLines() {
    //
    const names = this.charsInfo.map((i) => i.name)
    let edges: string[] = []
    for (const name of names) {
      edges.push(`${name}_e1_1`)
      edges.push(`${name}_e1_2`)
      edges.push(`${name}_e2_1`)
      edges.push(`${name}_e2_2`)
    }

    let count = 0

    while (0 < edges.length && count < 12) {
      const edge = edges[Math.trunc(Math.random() * edges.length)]
      const candidates = edges.filter((e) => e.split('_')[0] !== edge.split('_')[0])

      edges = edges.filter((e) => e !== edge)

      if (0 < candidates.length) {
        const target = candidates[Math.trunc(Math.random() * candidates.length)]
        const es = edge.split('_')
        const char = this.chars.find((c) => c.name === es[0])!
        if (es[1] === 'e1') {
          char.edge1PathTargets.push(target)
        } else {
          char.edge2PathTargets.push(target)
        }
        count++
        edges = edges.filter((e) => e !== target)
      }
    }

    const geo = new THREE.BufferGeometry()

    const vertices: number[] = []
    for (let i = 0; i < count; i++) {
      vertices.push(0, 0, 0)
      vertices.push(0, 0, 0)
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3).setUsage(THREE.DynamicDrawUsage))
    geo.attributes['position'].needsUpdate = true

    const mat = new THREE.MeshBasicMaterial({ color: '#000', opacity: 0.15, transparent: true })
    const mesh = new THREE.LineSegments(geo, mat)
    this.scene.add(mesh)
    return mesh
  }

  private gsapAnimation() {
    const tl = gsap.timeline()
    for (const char of this.chars) {
      const toAnimationSpeed = char.animationSpeed
      const toSpan = char.span
      char.animationSpeed = 1500
      char.span = 300

      tl.to(char, { animationSpeed: toAnimationSpeed, span: toSpan, duration: 2, ease: 'power1.out' }, '<')
    }
  }

  private anime() {
    const dt = this.clock.getDelta()

    let lineCount = 0
    for (const char of this.chars) {
      char.update(dt)

      // update lines
      const pos = this.line.geometry.getAttribute('position')

      for (let i = 0; i < 2; i++) {
        const pathTargets = i === 0 ? char.edge1PathTargets : char.edge2PathTargets
        const edge = i === 0 ? char.edge1 : char.edge2

        for (const pathTarget of pathTargets) {
          const ps = pathTarget.split('_')
          const targetChar = this.chars.find((c) => c.name === ps[0])!
          const targetEdge = ps[1] === 'e1' ? targetChar.edge1 : targetChar.edge2
          pos.array[lineCount * 6 + 0] = edge[0] + this.charGroup.position.x
          pos.array[lineCount * 6 + 1] = edge[1] + this.charGroup.position.y
          pos.array[lineCount * 6 + 3] = targetEdge[0] + this.charGroup.position.x
          pos.array[lineCount * 6 + 4] = targetEdge[1] + this.charGroup.position.y
          lineCount++
        }
      }
      pos.needsUpdate = true
    }

    this.render(this.camera)
  }

  private resize() {
    this.camera.update()
  }
}
