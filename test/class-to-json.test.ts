import { classToJSON, SerializableClass } from '../src'
import { expect } from 'chai'

describe('class-to-json', () => {
  describe('primitives', () => {
    it('passes through numbers', () => {
      expect(classToJSON(123)).to.equal(123)
    })
    it('passes through strings', () => {
      expect(classToJSON('123')).to.equal('123')
    })
    it('passes through symbols', () => {
      const smb = Symbol('xxx')
      expect(classToJSON(smb)).to.equal(smb)
    })
    it('passes through undefined and null', () => {
      expect(classToJSON(undefined)).to.equal(undefined)
      expect(classToJSON(null)).to.be.equal(null)
    })
  })

  describe('collections', () => {
    it('processes arrays of values', () => {
      const array = [1, 2, 'a', null]
      const t = classToJSON(array)
      expect(t).to.deep.equal(array)
      expect(t).to.not.equal(array)
    })
    it('processes sets of values', () => {
      const set = new Set([1, 2, 'a', null])
      const t = classToJSON(set)
      expect(t).to.deep.equal(set)
      expect(t).to.not.equal(set)
    })
    it('exposes a set that is serializable to json', () => {
      const array = [1, 2, 'a', null]
      const set = new Set(array)
      const t = JSON.parse(JSON.stringify(classToJSON(set)))
      expect(t).to.deep.equal(array)
    })

    it('processes maps of values', () => {
      const map = new Map<any, any>([
        [1, 1],
        [2, '2'],
        ['a', null]
      ])
      const t = classToJSON(map)
      expect(t).to.deep.equal(map)
      expect(t).to.not.equal(map)
    })
    it('exposes a map that is serializable to json', () => {
      const map = new Map<any, any>([
        [1, 1],
        [2, '2'],
        ['a', null]
      ])
      const t = JSON.parse(JSON.stringify(classToJSON(map)))
      expect(Object.fromEntries(Object.entries(t))).to.deep.equal(t)
    })
  })

  describe('typed arrays', () => {
    it('passes through Uint8Array', () => {
      const buf = new Uint8Array([1, 2, 3])
      expect(classToJSON(buf)).to.equal(buf)
    })
    it('passes through Uint16Array', () => {
      const buf = new Uint16Array([1, 2, 3])
      expect(classToJSON(buf)).to.equal(buf)
    })
    it('passes through Uint32Array', () => {
      const buf = new Uint32Array([1, 2, 3])
      expect(classToJSON(buf)).to.equal(buf)
    })
    it('passes through Int16Array', () => {
      const buf = new Int16Array([1, 2, 3])
      expect(classToJSON(buf)).to.equal(buf)
    })
    it('passes through Int32Array', () => {
      const buf = new Int32Array([1, 2, 3])
      expect(classToJSON(buf)).to.equal(buf)
    })
    it('passes through Float32Array', () => {
      const buf = new Float32Array([1, 2, 3])
      expect(classToJSON(buf)).to.equal(buf)
    })
    it('passes through Float64Array', () => {
      const buf = new Float64Array([1, 2, 3])
      expect(classToJSON(buf)).to.equal(buf)
    })
    it('passes through Buffer', () => {
      const buf = Buffer.from([1, 2, 3])
      expect(classToJSON(buf)).to.equal(buf)
    })
  })

  describe('simple objects', () => {
    it('copies simple objects', () => {
      const o = { a: 123, b: 'hello', c: { x: 1, y: 2 }, d: [1, 2, { a: 1, b: 2 }] }
      const t = classToJSON(o)
      expect(t.c).to.not.equal(o.a)
      expect(t.d).to.not.equal(o.d)
      expect(JSON.stringify(t)).to.equal(JSON.stringify(o))
    })
    it('sets source object as prototype', () => {
      const o = { x: 1 }
      const t = classToJSON(o)
      expect(Object.getPrototypeOf(t)).to.equal(o)
    })
  })

  describe('errors', () => {
    it('returns a valid error instance', () => {
      const e = new Error('hello world')
      ;(e as any).code = 'code'

      const t = classToJSON(e)
      expect(t).to.be.an.instanceof(Error)
      expect(t).to.not.equal(e)
      expect(Object.getPrototypeOf(t)).to.equal(e)
    })

    it('serializes errors', () => {
      const e = new Error('hello world')
      ;(e as any).code = 'code'

      const o = JSON.parse(JSON.stringify(classToJSON(e)))
      expect(o.code).to.equal('code')
      expect(o.message).to.equal(e.message)
      expect(o.name).to.equal(e.name)
      expect(o.stack).to.equal(e.stack)
    })
  })

  describe('classes', () => {
    it('serialize a class', () => {
      let nValue = 123

      class B {
        public get x(): string {
          return 'hello'
        }
      }

      class C extends B {
        public get n(): number {
          return nValue
        }

        public get y() {
          return {
            get a() {
              return 1
            }
          }
        }

        public z = 444
      }

      const o = new C()
      const t = classToJSON(o)

      expect(t).to.not.equal(o)
      expect(Object.getPrototypeOf(t)).to.equal(o)
      expect(t.n).to.equal(123)
      expect(t.x).to.equal('hello')
      expect(t.y.a).to.deep.equal(1)
      expect(t.z).to.equal(444)

      const p = JSON.parse(JSON.stringify(t))
      expect(p).to.deep.equal({ z: 444, n: 123, y: { a: 1 }, x: 'hello' })
      expect(p).to.deep.equal(t)

      nValue = 999
      expect(t.n).to.equal(123)
    })

    it('handles cycles', () => {
      class C {
        public get self() {
          return this
        }

        public get www() {
          return { x: this }
        }

        public z = 444
      }

      const o = new C()
      const t = classToJSON(o)

      expect(t).to.not.equal(o)
      expect(Object.getPrototypeOf(t)).to.equal(o)
      expect(t.z).to.equal(444)

      const p = JSON.parse(JSON.stringify(t))
      expect(p).to.deep.equal({ self: null, z: 444, www: { x: null } })
      expect(p).to.deep.equal(t)
    })
  })

  describe('SerializableClass', () => {
    it('serializes with a call to classToJSON', () => {
      class C extends SerializableClass {
        public get x() {
          return 909
        }
      }

      const o = new C()
      const t = classToJSON(o)

      expect(JSON.parse(JSON.stringify(t))).to.deep.equal({ x: 909 })
    })

    it('serializes with a call to toJSON', () => {
      class C extends SerializableClass {
        public get x() {
          return 909
        }
      }

      const c = new C()
      expect(JSON.parse(JSON.stringify(c))).to.deep.equal({ x: 909 })
    })

    it('does not serialize private fields', () => {
      class C extends SerializableClass {
        public _n: number = 123
        public get x() {
          return 909
        }
      }

      const c = new C()
      expect(JSON.parse(JSON.stringify(c))).to.deep.equal({ x: 909 })
    })
  })
})
