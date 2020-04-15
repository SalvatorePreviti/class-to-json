const _customSym: unique symbol = Symbol.for('classToJSON')
let _serialize: undefined | { (input: any): any }

function returnThis(this: any) {
  return this
}

const { isArray } = Array
const { isView } = ArrayBuffer
const { create: objectCreate, fromEntries: objectFromEntries, prototype: objectPrototype, getOwnPropertyNames } = Object
const { setPrototypeOf, getPrototypeOf, getOwnPropertyDescriptor, defineProperty } = Reflect

/**
 * Converts a class instance to a JSON serializable object, enumerating non enumerable members.
 */
const classToJSON = <T>(instance: T): T => {
  if (_serialize !== undefined) {
    return _serialize(instance)
  }

  const instancesMap = new Map()
  const customStack = new Set()
  const serializeStack = new Set()

  const process = (input: any) => {
    if (typeof input !== 'object' || input === null) {
      return input
    }
    if (instancesMap.has(input)) {
      return instancesMap.get(input)
    }
    let result: any

    if (typeof input[_customSym] === 'function') {
      if (!customStack.has(input)) {
        if (!(input instanceof SerializableSet) && !(input instanceof SerializableMap)) {
          customStack.add(input)
          result = input[_customSym]()
          instancesMap.set(input, result)
          customStack.delete(input)
          return result
        }
      }
    }

    if (input instanceof Promise || input instanceof WeakSet || input instanceof WeakMap) {
      return null
    }

    if (input instanceof Date || isView(input) || input instanceof RegExp) {
      serializeStack.delete(input)
      return input
    }

    if (serializeStack.has(input)) {
      return null
    }
    serializeStack.add(input)

    if (isArray(input)) {
      result = input.map((x) => process(x))
    } else if (input instanceof Set) {
      result = new SerializableSet(input)
    } else if (input instanceof Map) {
      result = new SerializableMap(input)
    } else {
      const processed = new Set()
      let c = input
      const inputProto = Object.getPrototypeOf(input)
      result = objectCreate(null)
      do {
        const keys = getOwnPropertyNames(c)
        for (let i = 0, len = keys.length; i < len; ++i) {
          const k = keys[i]
          if (!processed.has(k)) {
            processed.add(k)
            const p = getOwnPropertyDescriptor(c, k)
            if (p && ('get' in p || 'value' in p)) {
              const value = process(input[k])

              let shouldBeEnumerable = value !== undefined && typeof value !== 'symbol' && typeof value !== 'function'
              if (shouldBeEnumerable && k.startsWith('_')) {
                if (c !== input || (inputProto !== null && inputProto !== objectPrototype)) {
                  shouldBeEnumerable = false
                }
              }

              defineProperty(result, k, {
                value,
                configurable: true,
                enumerable: shouldBeEnumerable,
                writable: true
              })
            }
          }
        }
        c = getPrototypeOf(c)
      } while (c && c !== objectPrototype)
      if (processed.has('toJSON')) {
        defineProperty(result, 'toJSON', {
          value: returnThis,
          configurable: true,
          enumerable: false,
          writable: true
        })
      }
      setPrototypeOf(result, input)
    }
    if (result !== input) {
      defineProperty(result, _customSym, { value: returnThis, configurable: true, writable: true, enumerable: false })
    }
    instancesMap.set(input, result)
    serializeStack.delete(input)
    return result
  }

  _serialize = process
  try {
    return process(instance)
  } finally {
    _serialize = undefined
  }
}

/** Custom symbol that can be used to override a given object serialization */
classToJSON.custom = _customSym

class SerializableSet<T> extends Set<T> {
  public constructor(items: Iterable<T>) {
    super()
    for (const item of items) {
      this.add(classToJSON(item))
    }
  }

  public toJSON() {
    return Array.from(this)
  }
}

class SerializableMap<K, V> extends Map<K, V> {
  public constructor(items: Iterable<[K, V]>) {
    super()
    for (const [k, v] of items) {
      this.set(k, classToJSON(v))
    }
  }

  public toJSON() {
    return objectFromEntries(this)
  }
}

/**
 * Base class that supports serialization of not enumerable members as JSON.
 * Private and protected fields starting with _ will be ignored when serializing.
 */
abstract class SerializableClass {
  /**
   * Returns a representation of this class that is serializable to JSON.
   */
  public toJSON(): this {
    return classToJSON(this)
  }
}

export { SerializableClass, classToJSON }
