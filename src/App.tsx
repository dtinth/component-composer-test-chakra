import {
  ComponentProps,
  ComponentType,
  Fragment,
  ReactNode,
  useEffect,
  useState,
} from 'react'
import { Button, Stack, SystemProps } from '@chakra-ui/react'

import {
  AttributeSchema,
  ComponentComposerSchema,
  ComponentDescription,
  ComponentSchema,
} from '../../component-composer/src/schema'

class ReactComponentComposer {
  componentTypes: Record<string, ReactComponentType> = {}
  constructor() {
    this.addComponentType(
      'UserInterface',
      new ReactComponentType(Fragment).withSlot('children'),
    )
  }
  addComponentType(name: string, componentType: ReactComponentType) {
    this.componentTypes[name] = componentType
    return this
  }
  toJSON(): ComponentComposerSchema {
    return {
      components: Object.fromEntries(
        Object.entries(this.componentTypes).map(([name, componentType]) => [
          name,
          componentType.toJSON(),
        ]),
      ),
    }
  }
  render(
    { type, attributes, slots }: ComponentDescription,
    key = 'none',
  ): ReactNode {
    if (!this.componentTypes[type]) return null
    const component = this.componentTypes[type]
    const Component = component.Component
    const props: any = {}
    for (const [name, value] of Object.entries(attributes)) {
      const attributeSchema = component.attributes[name]
      if (!attributeSchema) continue
      props[name] = attributeSchema.toPropValue(value)
    }
    for (const name of component.slotNames) {
      const elements = slots[name]
      if (!elements) continue
      props[name] = elements.map((it, index) => this.render(it, name + index))
    }
    return <Component {...props} key={key} />
  }
}

class ReactComponentType<P extends ComponentType = any> {
  attributes: Record<string, AttributeType> = {}
  slotNames: string[] = []
  constructor(public Component: P) {}
  withAttribute<K extends keyof ComponentProps<P>>(
    name: K,
    type: AttributeType<ComponentProps<P>[K]>,
  ) {
    this.attributes[name as string] = type
    return this
  }
  withSlot(slotName: string = 'children') {
    this.slotNames.push(slotName)
    return this
  }
  toJSON(): ComponentSchema {
    return {
      attributes: Object.fromEntries(
        Object.entries(this.attributes).map(([name, type]) => [
          name,
          type.toJSON(),
        ]),
      ),
      slotNames: this.slotNames,
    }
  }
}

interface AttributeType<T = any> {
  toJSON(): AttributeSchema
  toPropValue(value: string): any
}

class OptionsAttribute implements AttributeType<string> {
  constructor(public options: string[]) {}
  toJSON(): AttributeSchema {
    return {
      type: 'options',
      options: this.options,
    }
  }
  toPropValue(value: string) {
    return value
  }
}

class StringAttribute<T = any> implements AttributeType<T> {
  constructor(public defaultValue: string = '') {}
  toJSON(): AttributeSchema {
    return {
      type: 'text',
    }
  }
  toPropValue(value: string) {
    return value
  }
}

const Text: React.FC<{ text: string }> = ({ text }) => (
  <Fragment>{text}</Fragment>
)

const schema = new ReactComponentComposer()
  .addComponentType(
    'Text',
    new ReactComponentType<any>(Text).withAttribute(
      'text',
      new StringAttribute(),
    ),
  )
  .addComponentType(
    'Button',
    new ReactComponentType(Button)
      .withAttribute(
        'colorScheme',
        new OptionsAttribute([
          'gray',
          'red',
          'orange',
          'yellow',
          'green',
          'teal',
          'blue',
          'cyan',
          'purple',
          'pink',
        ]),
      )
      .withAttribute(
        'variant',
        new OptionsAttribute(['solid', 'outline', 'ghost', 'link']),
      )
      .withSlot('leftIcon')
      .withSlot()
      .withSlot('rightIcon'),
  )
  .addComponentType(
    'Stack',
    new ReactComponentType(Stack)
      .withAttribute('direction', new OptionsAttribute(['row', 'column']))
      .withAttribute('spacing', new StringAttribute())
      .withAttribute(
        'align',
        new OptionsAttribute([
          'baseline',
          'center',
          'end',
          'start',
          'stretch',
        ] as SystemProps['alignItems'][] as string[]),
      )
      .withSlot('children'),
  )

function App() {
  const [ui, setUi] = useState<ReactNode>('Loading...')
  useEffect(() => {
    const schemaJson = schema.toJSON()
    addEventListener('message', (e) => {
      if (!e.data) return
      if (typeof e.data !== 'object') return

      switch (e.data.type) {
        case 'component-composer-ui': {
          const rendered = schema.render(e.data.payload)
          setUi(rendered)
          console.log(rendered)
          break
        }
      }
    })

    if (parent) {
      parent.postMessage(
        { type: 'component-composer-schema', payload: schemaJson },
        '*',
      )
    }
  }, [])

  return <div className="App">{ui}</div>
}

export default App
