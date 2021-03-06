import { update, DELETE, deepUpdate } from '../'
import { Option, Some, None } from 'space-lift'

const expect = require('expect')


describe('immupdate', () => {

  describe('update', () => {

    it('should not modify the original object', () => {
      const obj = { a: 33 }
      const result = update(obj, { a: 44 })
      expect(result).toNotBe(obj)
    })

    it('should return original object on update with same value', () => {
      const obj: { a: number } = { a: 33 }
      const result = update(obj, { a: 33 })
      expect(result).toBe(obj)
    })

    it('should return original object on removal of not set value', () => {
      const obj: { a?: number } = {}
      const result = update(obj, { a: DELETE })
      expect(result).toBe(obj)
    })

    it('can update a primitive key', () => {
      const result = update({ a: 33 }, { a: 44 })
      expect(result).toEqual({ a: 44 })
    })

    it('can update a key of type Object', () => {
      const obj = { a: { b: 33 } }
      const result = update(obj, { a: { b: 44 } })
      expect(result).toEqual({ a: { b: 44 } })
      expect(result.a).toNotBe(obj.a)
    })

    it('can update multiple keys', () => {
      const obj = { a: 33, b: 'bb', c: [] as number[] }
      const result = update(obj, { a: 44, c: [1, 2] })
      expect(result).toEqual({ a: 44, b: 'bb', c: [1, 2] })
    })

    it('can delete a nullable key', () => {
      const obj: { a?: number, b: number } = { a: 33, b: 44 }
      const result = update(obj, { a: DELETE })
      expect(result).toEqual({ b: 44 })
      expect(obj).toEqual({ a: 33, b: 44 })
    })

    it('can reset a key that can contain an undefined value', () => {
      const obj: { a: number | undefined, b: number } = { a: 33, b: 44 }
      const result = update(obj, { a: undefined })
      expect(result).toEqual({ a: undefined, b: 44 })
      expect(obj).toEqual({ a: 33, b: 44 })
    })

    it('can reset a key that can contain a null value', () => {
      const obj: { a: number | null, b: number } = { a: 33, b: 44 }
      const result = update(obj, { a: null })
      expect(result).toEqual({ a: null, b: 44 })
      expect(obj).toEqual({ a: 33, b: 44 })
    })

    // it('can work with a generic key/value', () => {
    //   // Doesn't work right now thanks to TS dreaded string widening
    //   function genericUpdate<T, K extends keyof T>(host: T, key: K, value: T[K]): T {
    //     return update(host, { [key]: value })
    //   }
    // })

  })


  describe('deepUpdate', () => {

    interface Person {
      id: string
      contact: {
        email: string,
        phoneNumbers: string[]
      }
      prefs?: {
        receiveNotifications: boolean
        csvSeparator?: ';' | ','
      },
      customData: {
        favoriteColor: string
      }
    }

    const defaultPrefs = { receiveNotifications: false }

    const person: Person = {
      id: '44',
      contact: {
        email: 'gege@ymail.com',
        phoneNumbers: []
      },
      customData: {
        favoriteColor: 'blue'
      }
    }

    it('can update a value at the first level', () => {
      type NullableObj = { a: number } | undefined

      const obj = { a: 1 }
      const result = deepUpdate<NullableObj>(obj)
        .set({ a: 10 })

      expect(result).toNotBe(obj)
      expect(result).toEqual({ a: 10 })
    })

    
    it('does not mutate a passed defaultValue', () => {
      const obj = {
        a: '',
        b: undefined as { c: string } | undefined
      }

      const defaultValue = { c: 'defaultC' }

      deepUpdate(obj)
        .at('b')
        .withDefault(defaultValue)
        .at('c')
        .set('newC')

      expect(defaultValue.c).toBe('defaultC')
    })

    it('can update an object typed as a dictionary', () => {
      type PeopleById = Record<string, { name: string } | undefined>

      const obj = {
        people: { '001': { name: 'Roberto' } } as PeopleById
      }

      const result = deepUpdate(obj)
        .at('people')
        .at('001')
        .abortIfUndef()
        .at('name')
        .set('Roberta')

      expect(result.people['001']).toNotBe(obj.people['001'])
      expect(result.people).toEqual({ '001': { name: 'Roberta' } })
    })

    it('can update a root Array', () => {
      // regular notation
      const result = deepUpdate([person, person, person])
        .at(2)
        .abortIfUndef()
        .at('contact')
        .at('email')
        .set('jojo@gmail.com')

      expect(result).toEqual([ person, person, {
        id: '44',
        contact: {
          email: 'jojo@gmail.com',
          phoneNumbers: []
        },
        customData: {
          favoriteColor: 'blue'
        }
      } ])
    })

    it('can update a nested Array', () => {
      const result = deepUpdate(person)
        .at('contact')
        .at('phoneNumbers')
        .at(0)
        .set('06123456')

      expect(result).toEqual({
        id: '44',
        contact: {
          email: 'gege@ymail.com',
          phoneNumbers: ['06123456']
        },
        customData: {
          favoriteColor: 'blue'
        }
      })

      // The updated path should have changed reference
      expect(result.contact).toNotBe(person.contact)
      expect(result.contact.phoneNumbers).toNotBe(person.contact.phoneNumbers)

      // The paths left untouched should not have new references
      expect(result.customData).toBe(person.customData)
    })

    it('can update a nested field', () => {
      const result = deepUpdate(person)
        .at('contact')
        .at('email')
        .set('tarzan@gmail.com')

      const expected = {
        id: '44',
        contact: {
          email: 'tarzan@gmail.com',
          phoneNumbers: []
        },
        customData: {
          favoriteColor: 'blue'
        }
      }

      expect(result).toEqual(expected)
    })

    it('can update a missing Array index with a default element', () => {
      const target = {
        items: [
          { a: 1, b: 2 },
          { a: 11, b: 22 }
        ]
      }

      const defaultValue = { a: 100, b: 0 }

      const result = deepUpdate(target)
        .at('items')
        .at(2)
        .withDefault(defaultValue)
        .at('b')
        .set(1000)

      const expected = {
        items: [
          { a: 1, b: 2 },
          { a: 11, b: 22 },
          { a: 100, b: 1000 }
        ]
      }

      expect(result).toNotBe(expected)
      expect(result).toEqual(expected)
    })

    it('can abort an update to a missing Array index', () => {
      const target = {
        items: [
          { a: 1, b: 2 },
          { a: 11, b: 22 }
        ]
      }

      const result = deepUpdate(target)
        .at('items')
        .at(2)
        .abortIfUndef()
        .at('b')
        .set(1000)

      expect(result).toEqual(target)
    })

    it('can update a field with a DEFINED nullable higher up in the path', () => {
      const personWithPrefs: Person = {
        id: '44',
        prefs: { receiveNotifications: true },
        contact: {
          email: 'gege@ymail.com',
          phoneNumbers: []
        },
        customData: { favoriteColor: 'green' }
      }

      const result = deepUpdate(personWithPrefs)
        .at('prefs')
        .withDefault(defaultPrefs)
        .at('csvSeparator')
        .set(',')

      expect(result).toEqual({
        id: '44',
        prefs: {
          receiveNotifications: true,
          csvSeparator: ','
        },
        contact: {
          email: 'gege@ymail.com',
          phoneNumbers: []
        },
        customData: { favoriteColor: 'green' }
      })

      expect(result.prefs).toNotBe(personWithPrefs.prefs)
    })

    it('can update a field with an UNDEFINED nullable higher up in the path', () => {
      const result = deepUpdate(person)
        .at('prefs')
        .withDefault(defaultPrefs)
        .at('csvSeparator')
        .set(',')

      expect(result).toEqual({
        id: '44',
        prefs: {
          receiveNotifications: false,
          csvSeparator: ','
        },
        contact: {
          email: 'gege@ymail.com',
          phoneNumbers: []
        },
        customData: { favoriteColor: 'blue' }
      })

      expect(result.prefs).toNotBe(person.prefs)
    })

    it('can modify a value', () => {

      const result = deepUpdate(person)
        .at('contact')
        .at('email')
        .modify(email => `${email}xx`)

      const expected = {
        id: '44',
        contact: {
          email: 'gege@ymail.comxx',
          phoneNumbers: []
        },
        customData: { favoriteColor: 'blue' }
      }

      expect(result).toEqual(expected)

      expect(result.contact).toNotBe(person.contact)
      expect(result.prefs).toBe(person.prefs)
    })

    it('can have a withDefault() in the last position', () => {
      interface Panel {
        id?: string
        isCollapsed?: false
        data?: number
      }

      const defaultPanel: Panel = { isCollapsed: false }

      interface PanelCollection {
        panels: { [panelId: string]: Panel }
      }

      const initial: PanelCollection = {
        panels: {}
      }

      const updatedPanel = { id: '01', data: 333 }

      const result = deepUpdate(initial)
        .at('panels')
        .at(updatedPanel.id)
        .withDefault(defaultPanel)
        .modify(p => ({ ...p, ...updatedPanel }))

      expect(result).toEqual({
        panels: {
          '01': {
            id: '01',
            isCollapsed: false,
            data: 333
          }
        }
      })
    })

    it('can have multiple withDefault() in the chain', () => {
      interface NestedStructure {
        a?: {
          b?: {
            c: number
          },
          bb: string
        }
      }

      const nestedStructure: NestedStructure = {}

      const result = deepUpdate(nestedStructure)
        .at('a')
        .withDefault({ bb: 'bbb' })
        .at('b')
        .withDefault({ c: 10 })
        .at('c')
        .modify(v => v * 10)

      expect(result).toEqual({
        a: {
          b: {
            c: 100
          },
          bb: 'bbb'
        }
      })

    })

    it('can have multiple abortIfUndef() in the chain', () => {
      interface NestedStructure {
        a?: {
          b?: {
            c: number
          },
          bb: string
        }
      }

      const nestedStructure: NestedStructure = {}

      const result = deepUpdate(nestedStructure)
        .at('a')
        .abortIfUndef()
        .at('b')
        .abortIfUndef()
        .at('c')
        .modify(v => v * 10)

      expect(result).toBe(nestedStructure)
    })

    it('can have an abortIfUndef() in the last position', () => {
      interface Panel {
        id?: string
        isCollapsed?: false
        data?: number
      }

      const defaultPanel: Panel = { isCollapsed: false }

      interface PanelCollection {
        panels: { [panelId: string]: Panel }
      }

      const emptyCollection: PanelCollection = {
        panels: {}
      }

      const collection: PanelCollection = {
        panels: {
          '01': defaultPanel
        }
      }

      const updatedPanel = { id: '01', data: 333 }

      const result = deepUpdate(emptyCollection)
        .at('panels')
        .at(updatedPanel.id)
        .abortIfUndef()
        .set(updatedPanel)

      expect(result).toEqual({
        panels: {}
      })

      const result2 = deepUpdate(collection)
        .at('panels')
        .at(updatedPanel.id)
        .abortIfUndef()
        .set(updatedPanel)

      expect(result2).toEqual({
        panels: {
          '01': updatedPanel
        }
      })

      expect(result2.panels).toNotBe(collection.panels)
      expect(result2.panels['01']).toBe(updatedPanel)
    })

    it('can update an Array value', () => {
      const data = { a: { b: ['hey'] } }
      const updated = deepUpdate(data).at('a').at('b').set(['bye', ':)'])
      expect(updated).toEqual({
        a: { b: ['bye', ':)'] }
      })
    })

    it('works with a real life example', () => {
      type H1 = {
        tag: string,
        props: any,
        children: Array<{
          props: {
            class: string
            styles?: Record<string, string>,
            value?: string
            url?: string
          }
          tag: string
        }>
      }

      const h1: H1 = {
        "tag":"Group",
        "props":{
          "styles":{
            "display":"flex",
            "flex-direction":"row"
          }
        },
        "children":[
          {
            "props":{
              "class":"employee-name",
              "styles":{
                "color":"#33cc33"
              },
              "value":"Jane Doe "
            },
            "tag":"Text"
          },
          {
            "props":{
              "class":"employee-photo",
              "url":"http..."
            },
            "tag":"Image"
          }
        ]
      }

      const h11 = deepUpdate(h1)
        .at('children')
        .at(0).abortIfUndef()
        .at("props")
        .at("styles").withDefault({})
        .at('background-color').set('#ff0000')

      const h12 = deepUpdate(h11)
        .at('children')
        .at(1).abortIfUndef()
        .at("props")
        .at("styles").withDefault({})
        .at('background-color').set('#ffeedd')

      expect(h12).toEqual({
        "tag":"Group",
        "props":{
          "styles":{
            "display":"flex",
            "flex-direction":"row"
          }
        },
        "children":[
          {
            "props":{
              "class":"employee-name",
              "styles":{
                "color":"#33cc33",
                "background-color": "#ff0000"
              },
              "value":"Jane Doe "
            },
            "tag":"Text"
          },
          {
            "props":{
              "class":"employee-photo",
              "url":"http...",
              "styles": {
                "background-color": "#ffeedd"
              }
            },
            "tag":"Image"
          }
        ]
      })

    })

    it('can delete a deep optional property', () => {

      type NestedDict = {
        a: { b: { c?: number, d?: number } }
      }

      const nestedDict: NestedDict = { a: { b: { c: 1, d: 2 } } }

      const updated = deepUpdate(nestedDict)
        .at('a')
        .at('b')
        .at('d')
        .set(DELETE)

      const updated2 = deepUpdate(nestedDict)
        .at('a')
        .at('b')
        .at('d')
        .modify(d => d === 2 ? DELETE : 3)

      expect(updated).toEqual({ a: { b: { c: 1 } } })
      expect(updated.a.b.d).toBe(undefined)

      expect(updated2).toEqual({ a: { b: { c: 1 } } })
      expect(updated2.a.b.d).toBe(undefined)
    })

    it('can modify a nested nullable property with or without abortIfUndef() in the last position', () => {

      type NullableString = string | undefined
      type Obj = { a: { b: NullableString } }

      const obj1: Obj = { a: { b: undefined } }
      const updated = deepUpdate(obj1)
        .at('a')
        .at('b')
        .abortIfUndef()
        .modify(s => s + '_')

      expect(updated).toEqual({ a: { b: undefined} })
      expect(updated).toBe(obj1)

      const updated2 = deepUpdate(obj1)
        .at('a')
        .at('b')
        .modify(s => s && 'hey')

      expect(updated2).toEqual({ a: { b: undefined } })

      const obj2: Obj = { a: { b: 'aaa' } }

      const updated3 = deepUpdate(obj2)
        .at('a')
        .at('b')
        .abortIfUndef()
        .modify(s => s + '_')

      expect(updated3).toEqual({ a: { b: 'aaa_'} })
      expect(updated3).toNotBe(obj2)

      const updated4: Obj = deepUpdate(obj2)
        .at('a')
        .at('b')
        .modify(s => s + '_')

      expect(updated4).toEqual({ a: { b: 'aaa_' } })
      expect(updated4).toNotBe(obj2)
    })

    it('can update an union member with an instance of this union', () => {

      type A = { type: 'a', data: number }
      type B = { type: 'b', data: string }
      type U = A | B

      type Obj = { u: U }

      const obj: Obj = { u: { type: 'a', data: 10 } }

      const updated = deepUpdate(obj)
        .at('u')
        .set({ type: 'b', data: '11' })

      expect(updated).toEqual({
        u: { type: 'b', data: '11' }
      })
    })

    it('can abort if a simple condition is not met', () => {
      type Obj = { a?: { version: number, data: string } }

      const obj: Obj = { a: { version: 0, data: '001' } }

      const updated = deepUpdate(obj)
        .at('a')
        .abortIfUndef()
        .abortIfNot(a => a.version === 0)
        .at('data')
        .set('002')

      expect(updated).toNotBe(obj)
      expect(updated).toEqual({
        a: { version: 0, data: '002' }
      })

      const obj2: Obj = { a: { version: 1, data: '001' } }

      const updated2 = deepUpdate(obj2)
        .at('a')
        .abortIfUndef()
        .abortIfNot(a => a.version === 0)
        .set({ version: 2, data: 'zzz' })

      expect(updated2).toBe(obj2)
    })

    it('can abort if a type guard is not passed', () => {

      type A = { type: 'a', data: number }
      type B = { type: 'b', data: string }
      type U = A | B

      const isA = (u: U): u is A => u.type === 'a'

      type Obj = { u: U }

      const obj: Obj = { u: { type: 'a', data: 10 } }

      const updated = deepUpdate(obj)
        .at('u')
        .abortIfNot(isA)
        .at('data')
        .set(20)

      expect(updated).toEqual({
        u: { type: 'a', data: 20 }
      })
    })

    it('should return original object on set() with same value', () => {
      const obj = { a: { b: { c: 10 } } }
      const result = deepUpdate(obj).at('a').at('b').at('c').set(10)
      expect(result).toBe(obj)
    })

    it('should return original object on modify() with same value', () => {
      const obj = { a: { b: { c: 10 } } }
      const result = deepUpdate(obj).at('a').at('b').at('c').modify(v => v)
      expect(result).toBe(obj)
    })

    it('should return original object on set() with same value but with a withDefault() that was used', () => {
      const obj: { a: { b?: { c: number } } } = { a: {} }
      const result = deepUpdate(obj).at('a').at('b').withDefault({ c: 10 }).at('c').set(10)
      expect(result).toNotBe(obj)
    })

    it('should not return original object on set() with same value but with a withDefault() that was actually used', () => {
      const obj: { a: { b?: { c: number } } } = { a: { b: { c: 10 } } }
      const result = deepUpdate(obj).at('a').at('b').withDefault({ c: 10 }).at('c').set(10)
      expect(result).toBe(obj)
    })


    // Option support

    // Option<{}>

    it('can update a lone Some({})', () => {
      const some = Some({ a: 1 })

      const result = deepUpdate(some).set({ a: 10 })

      expect(result).toNotBe(some)
      expect(result.get()).toEqual({ a: 10 })
    })

    it('can update a lone None', () => {
      const none = makeNone<{ a: number }>()

      const result = deepUpdate(none).set({ a: 10 })

      expect(result).toNotBe(none)
      expect(result.get()).toEqual({ a: 10 })
    })

    it('can update a top level Some({})', () => {
      const some = Some({ a: { b: 1 } })

      const result = deepUpdate(some)
        .abortIfUndef()
        .at('a')
        .at('b')
        .set(10)

      expect(result).toNotBe(some)
      expect(result.get()).toNotBe(some.get())
      expect(result.get().a).toNotBe(some.get().a)
      expect(result.get()).toEqual({ a: { b: 10 } })
    })

    it('can update a top level None', () => {
      const none = makeNone<{ a: { b: number } }>()

      const result = deepUpdate(none)
        .abortIfUndef()
        .at('a')
        .at('b')
        .set(10)

      expect(result).toBe(None)
    })

    it('can update a path containing a Some({}), using abortIfUndef()', () => {
      const obj = {
        a: Some({
          b: { c: 1 },
          z: {}
        })
      }

      const result = deepUpdate(obj)
        .at('a')
        .abortIfUndef()
        .at('b')
        .at('c')
        .set(10)

      expect(result).toNotBe(obj)
      expect(result.a).toNotBe(obj.a)
      expect(result.a.get().b).toNotBe(obj.a.get().b)
      expect(result.a.get().z).toBe(obj.a.get().z)
      expect(result.a.get()).toEqual({
        b: { c: 10 },
        z: {}
      })
    })

    it('can update a path containing a Some({}), using withDefault()', () => {
      const obj = {
        a: Some({
          b: { c: 1 },
          x: { y: 'y' }
        })
      }

      const defaultValue = { b: { c: 3 }, x: { y: 'defaultY' } }

      const result = deepUpdate(obj)
        .at('a')
        .withDefault(defaultValue) 
        .at('b')
        .at('c')
        .set(10)

      expect(result).toNotBe(obj)
      expect(result.a).toNotBe(obj.a)
      expect(result.a).toNotBe(defaultValue)
      expect(result.a.get().b).toNotBe(obj.a.get().b)
      expect(result.a.get()).toEqual({
        b: { c: 10 },
        x: { y: 'defaultY' }
      })
    })

    it('can update a path containing a None, using abortIfUndef()', () => {
      const none = makeNone<{
        b: { c: number },
        z: {}
      }>()

      const obj = {
        a: none
      }

      const result = deepUpdate(obj)
        .at('a')
        .abortIfUndef()
        .at('b')
        .at('c')
        .set(10)

      expect(result).toBe(obj) // Noop
      expect(result.a).toBe(None)
    })

    it('can update a path containing a None, using withDefault()', () => {
      const none = makeNone<{
        b: { c: number },
        z: {}
      }>()

      const obj = {
        a: none
      }

      const defaultValue = {
        b: { c: 1 },
        z: {}
      }

      const result = deepUpdate(obj)
        .at('a')
        .withDefault(defaultValue)
        .at('b')
        .at('c')
        .set(10)

      expect(result).toNotBe(obj)
      expect(result.a.get()).toEqual({ b: { c: 10 }, z: {} })
      expect(result.a.get()!.z).toBe(defaultValue.z)
      expect(defaultValue.b.c).toBe(1) // defaultValue was not mutated
    })

    it('can update a path ending with a Some({})', () => {
      const obj = {
        a: Some({ b: 1 })
      }

      const result = deepUpdate(obj)
        .at('a')
        .set({ b: 10 })

      expect(result).toNotBe(obj)
      expect(result.a).toNotBe(obj.a)
      expect(result.a.get()).toEqual({ b: 10 })
    })

    it('can update a path ending with a None, using the proper value', () => {
      const none = makeNone<{ b: number }>()

      const obj = {
        a: none
      }

      const result = deepUpdate(obj)
        .at('a')
        .set({ b: 10 })

      expect(result).toNotBe(obj)
      expect(result.a.get()).toEqual({ b: 10 })
    })

    it('can update a path ending with a None, using undefined', () => {
      const none = makeNone<{ b: number }>()

      const obj = {
        a: none
      }

      const result = deepUpdate(obj)
        .at('a')
        .set(undefined)

      expect(result).toNotBe(obj)
      expect(result.a).toEqual(None)
    })

    it('can update a path containing two consecutive Some()', () => {
      const obj = {
        a: Some({
          b: Some({ c: 1 }),
          x: { y: 'y' }
        })
      }

      const result = deepUpdate(obj)
        .at('a')
        .abortIfUndef()
        .at('b')
        .abortIfUndef()
        .at('c')
        .set(10)

      expect(result).toNotBe(obj)
      expect(result.a).toNotBe(obj.a)
      expect(result.a.get().b).toNotBe(obj.a.get().b)
      expect(result.a.flatMap(a => a.b).get()).toEqual({ c: 10 })
      expect(result.a.get().x).toBe(obj.a.get().x)
    })

    it('can update a path containing a Some then a None', () => {
      const obj = {
        a: Some({
          b: makeNone<{ c: number }>(),
          x: { y: 'y' }
        })
      }

      const defaultValue = { c: 100 }

      const result = deepUpdate(obj)
        .at('a')
        .abortIfUndef()
        .at('b')
        .withDefault(defaultValue)
        .at('c')
        .set(10)

      expect(result).toNotBe(obj)
      expect(result.a).toNotBe(obj.a)
      expect(result.a.get().b).toNotBe(obj.a.get().b)
      expect(result.a.flatMap(a => a.b).get()).toEqual({ c: 10 })
      expect(result.a.get().x).toBe(obj.a.get().x) // This path was left untouched
    })

    it('can update a path containing a None then a Some', () => {
      const obj = {
        a: makeNone<{ b: Option<{c : number}> }>()
      }

      const defaultA = { b: Some({ c: 10 }) }

      const result = deepUpdate(obj)
        .at('a')
        .withDefault(defaultA)
        .at('b')
        .abortIfUndef()
        .at('c')
        .set(100)

      expect(result).toNotBe(obj)
      expect(result.a).toNotBe(obj.a)
      expect(result.a.get()!.b.get()).toEqual({ c: 100 })
    })

    it('can delete a Some({}) property', () => {
      const obj = {
        a: Some({ b: 10, c: 10 as number | undefined })
      }

      const result = deepUpdate(obj).at('a').abortIfUndef().at('c').set(DELETE)

      expect(result).toNotBe(obj)
      expect(result.a).toNotBe(obj.a)
      expect(result.a.get()).toEqual({ b: 10 })
    })

    it('can delete a None({}) property', () => {
      const obj = {
        a: makeNone<{ b: number, c: number | undefined }>()
      }

      const result = deepUpdate(obj).at('a').abortIfUndef().at('c').set(DELETE)

      expect(result).toBe(obj)
      expect(result.a).toBe(None)
    })

    // Option<[]>

    it('can update a path containing a Some(number[])', () => {
      const obj = {
        a: Some([1, 2, 3])
      }

      const result = deepUpdate(obj).at('a').abortIfUndef().at(3).set(4)

      expect(result).toNotBe(obj)
      expect(result.a.get()).toEqual([1, 2, 3, 4])
    })

    it('can update a path containing a None(number[])', () => {
      const obj = {
        a: makeNone<number[]>()
      }

      const defaultValue = [1, 2, 3]

      const result = deepUpdate(obj).at('a').withDefault(defaultValue).at(3).set(4)

      expect(result).toNotBe(obj)
      expect(result.a.get()).toEqual([1, 2, 3, 4])
      expect(result.a.get()).toNotBe(defaultValue) // the default value was not mutated in place.
    })

    it('can update a path containing a Some(Array<{}>)', () => {
      const obj = {
        a: Some([
          { name: 'John' },
          { name: 'Roberto' }
        ])
      }

      const result = deepUpdate(obj)
        .at('a')
        .abortIfUndef()
        .at(1)
        .abortIfUndef()
        .at('name')
        .set('Roberta')

      expect(result).toNotBe(obj)
      expect(result.a.get()).toEqual([
        { name: 'John' },
        { name: 'Roberta' }
      ])
    })

    // Option<primitive>

    it('can update a path containing a Some(primitive)', () => {
      const obj = {
        a: Some(1)
      }

      const result = deepUpdate(obj)
        .at('a')
        .set(10)

      expect(result).toNotBe(obj)
      expect(result.a).toNotBe(obj.a)
      expect(result.a.get()).toBe(10)
    })

    it('can update a path containing a None(primitive)', () => {
      const obj = {
        a: makeNone<number>()
      }

      const result = deepUpdate(obj)
        .at('a')
        .set(10)

      expect(result).toNotBe(obj)
      expect(result.a).toNotBe(obj.a)
      expect(result.a.get()).toBe(10)
    })

  })

})


function makeNone<T>() {
  return Option<T>(null)
}