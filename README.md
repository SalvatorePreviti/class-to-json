# class-to-json

Serialization strategy for classes.

```ts
/**
 * Converts a class instance to a JSON serializable object, enumerating non enumerable members.
 */
export function classToJSON<T>(instance: T): T;

/** Custom symbol that can be used to override a given object serialization */
classToJSON.custom: unique symbol

/**
 * Base class that supports serialization of not enumerable members as JSON.
 * Private and protected fields starting with _ will be ignored when serializing.
 */
export abstract class SerializableClass {
  /**
   * Returns a representation of this class that is serializable to JSON.
   */
  toJSON(): this
}
```

# license

MIT License

Copyright (c) 2020, Salvatore Previti
