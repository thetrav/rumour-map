import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import AddRumourForm from '@/components/AddRumourForm.vue'

describe('AddRumourForm', () => {
  const defaultProps = {
    show: true,
    coordinates: { x: 1234, y: 5678 }
  }

  it('renders when show is true', () => {
    const wrapper = mount(AddRumourForm, {
      props: defaultProps
    })

    expect(wrapper.find('.form-overlay').exists()).toBe(true)
    expect(wrapper.find('.form-title').text()).toBe('Add New Rumour')
  })

  it('does not render when show is false', () => {
    const wrapper = mount(AddRumourForm, {
      props: {
        ...defaultProps,
        show: false
      }
    })

    expect(wrapper.find('.form-overlay').exists()).toBe(false)
  })

  it('displays coordinates correctly', () => {
    const wrapper = mount(AddRumourForm, {
      props: defaultProps
    })

    expect(wrapper.find('.coordinates-value').text()).toBe('X: 1234, Y: 5678')
  })

  it('emits cancel event when cancel button is clicked', async () => {
    const wrapper = mount(AddRumourForm, {
      props: defaultProps
    })

    await wrapper.find('.btn-secondary').trigger('click')
    
    expect(wrapper.emitted('cancel')).toBeTruthy()
    expect(wrapper.emitted('cancel')?.length).toBe(1)
  })

  it('emits cancel event when close button is clicked', async () => {
    const wrapper = mount(AddRumourForm, {
      props: defaultProps
    })

    await wrapper.find('.close-btn').trigger('click')
    
    expect(wrapper.emitted('cancel')).toBeTruthy()
  })

  it('emits cancel event when overlay is clicked', async () => {
    const wrapper = mount(AddRumourForm, {
      props: defaultProps
    })

    await wrapper.find('.form-overlay').trigger('click')
    
    expect(wrapper.emitted('cancel')).toBeTruthy()
  })

  it('does not emit cancel when form container is clicked', async () => {
    const wrapper = mount(AddRumourForm, {
      props: defaultProps
    })

    await wrapper.find('.form-container').trigger('click')
    
    expect(wrapper.emitted('cancel')).toBeFalsy()
  })

  it('requires title to submit', async () => {
    const wrapper = mount(AddRumourForm, {
      props: defaultProps
    })

    // Try to submit without title
    await wrapper.find('form').trigger('submit.prevent')
    
    expect(wrapper.emitted('save')).toBeFalsy()
  })

  it('emits save event with form data when submitted with valid data', async () => {
    const wrapper = mount(AddRumourForm, {
      props: defaultProps
    })

    // Fill in form
    await wrapper.find('#title').setValue('Test Rumour')
    await wrapper.find('#details').setValue('Test details')
    await wrapper.find('#session_date').setValue('2024-01-15')
    await wrapper.find('#rating').setValue('7')
    
    // Find the resolved checkbox (second checkbox)
    const checkboxes = wrapper.findAll('.form-checkbox')
    await checkboxes[1].setValue(true)

    // Submit form
    await wrapper.find('form').trigger('submit.prevent')
    
    expect(wrapper.emitted('save')).toBeTruthy()
    const emittedData = wrapper.emitted('save')?.[0]?.[0]
    
    expect(emittedData).toMatchObject({
      title: 'Test Rumour',
      details: 'Test details',
      session_date: '2024-01-15',
      rating: 7,
      is_a_place: false,
      resolved: true
    })
  })

  it('converts empty strings to null when submitting', async () => {
    const wrapper = mount(AddRumourForm, {
      props: defaultProps
    })

    await wrapper.find('#title').setValue('Test')
    await wrapper.find('#details').setValue('  ')  // Empty whitespace
    
    await wrapper.find('form').trigger('submit.prevent')
    
    const emittedData = wrapper.emitted('save')?.[0]?.[0]
    expect(emittedData.details).toBe(null)
  })

  it('resets form when show prop changes to true', async () => {
    const wrapper = mount(AddRumourForm, {
      props: {
        ...defaultProps,
        show: false
      }
    })

    // Set show to true
    await wrapper.setProps({ show: true })
    
    // Check that form is empty
    expect((wrapper.find('#title').element as HTMLInputElement).value).toBe('')
    expect((wrapper.find('#details').element as HTMLTextAreaElement).value).toBe('')
  })

  it('disables submit button when title is empty', async () => {
    const wrapper = mount(AddRumourForm, {
      props: defaultProps
    })

    const submitButton = wrapper.find('.btn-primary')
    expect((submitButton.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('enables submit button when title is provided', async () => {
    const wrapper = mount(AddRumourForm, {
      props: defaultProps
    })

    await wrapper.find('#title').setValue('Test')
    
    const submitButton = wrapper.find('.btn-primary')
    expect((submitButton.element as HTMLButtonElement).disabled).toBe(false)
  })

  it('handles all optional fields correctly', async () => {
    const wrapper = mount(AddRumourForm, {
      props: defaultProps
    })

    await wrapper.find('#title').setValue('Minimal Rumour')
    await wrapper.find('#session_date').setValue('Session 10')
    
    // For HarptosDateInput, we need to find the component and interact with it
    // The input wrapper will emit update:modelValue when changed
    const dateInputComponent = wrapper.findComponent({ name: 'HarptosDateInput' })
    await dateInputComponent.vm.$emit('update:modelValue', 'Year 2')
    
    await wrapper.find('#location_heard').setValue('Tavern')
    await wrapper.find('#location_targetted').setValue('Castle')
    
    await wrapper.find('form').trigger('submit.prevent')
    
    const emittedData = wrapper.emitted('save')?.[0]?.[0]
    expect(emittedData).toMatchObject({
      title: 'Minimal Rumour',
      session_date: 'Session 10',
      game_date: 'Year 2',
      location_heard: 'Tavern',
      location_targetted: 'Castle',
      details: null,
      rating: null,
      is_a_place: false,
      resolved: false
    })
  })

  it('handles is_a_place checkbox correctly', async () => {
    const wrapper = mount(AddRumourForm, {
      props: defaultProps
    })

    await wrapper.find('#title').setValue('Place Marker')
    
    // Find the is_a_place checkbox (first checkbox)
    const checkboxes = wrapper.findAll('.form-checkbox')
    await checkboxes[0].setValue(true)
    
    await wrapper.find('form').trigger('submit.prevent')
    
    const emittedData = wrapper.emitted('save')?.[0]?.[0]
    expect(emittedData.is_a_place).toBe(true)
  })
})
