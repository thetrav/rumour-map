import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import HarptosDatePicker from '@/components/HarptosDatePicker.vue'

describe('HarptosDatePicker', () => {
  it('renders with default state (none selected)', () => {
    const wrapper = mount(HarptosDatePicker, {
      props: {
        modelValue: null
      }
    })
    
    expect(wrapper.find('input[value="none"]').element.checked).toBe(true)
  })

  it('parses existing Harptos date correctly', async () => {
    const wrapper = mount(HarptosDatePicker, {
      props: {
        modelValue: '15 Hammer, 1492 DR'
      }
    })
    
    // Wait for component to mount and parse
    await wrapper.vm.$nextTick()
    
    // Check that month-day radio is selected
    expect(wrapper.find('input[value="month-day"]').element.checked).toBe(true)
    
    // Check preview shows the date
    expect(wrapper.text()).toContain('15 Hammer, 1492 DR')
  })

  it('parses special day dates correctly', async () => {
    const wrapper = mount(HarptosDatePicker, {
      props: {
        modelValue: 'Midsummer, 1492 DR'
      }
    })
    
    await wrapper.vm.$nextTick()
    
    // Check that special day radio is selected
    expect(wrapper.find('input[value="special"]').element.checked).toBe(true)
    
    // Check preview shows the date
    expect(wrapper.text()).toContain('Midsummer, 1492 DR')
  })

  it('shows correct date format in preview for month and year', async () => {
    const wrapper = mount(HarptosDatePicker, {
      props: {
        modelValue: null
      }
    })
    
    // Select month-day type
    await wrapper.find('input[value="month-day"]').setValue(true)
    await wrapper.vm.$nextTick()
    
    // Get month select and set it to Hammer (index 0)
    const monthSelect = wrapper.findAll('select')[1]
    monthSelect.element.value = '0'
    await monthSelect.trigger('change')
    await wrapper.vm.$nextTick()
    
    // Set year
    const yearInput = wrapper.find('input[type="number"]')
    yearInput.element.value = '1492'
    await yearInput.trigger('input')
    await wrapper.vm.$nextTick()
    
    // Check the preview shows the formatted date
    expect(wrapper.text()).toContain('Hammer, 1492 DR')
  })

  it('shows correct date format in preview with day, month and year', async () => {
    const wrapper = mount(HarptosDatePicker, {
      props: {
        modelValue: null
      }
    })
    
    // Select month-day type
    await wrapper.find('input[value="month-day"]').setValue(true)
    await wrapper.vm.$nextTick()
    
    // Get selects
    const selects = wrapper.findAll('select')
    const daySelect = selects[0]
    const monthSelect = selects[1]
    
    // Select day 15
    daySelect.element.value = '15'
    await daySelect.trigger('change')
    await wrapper.vm.$nextTick()
    
    // Select month (Hammer is index 0)
    monthSelect.element.value = '0'
    await monthSelect.trigger('change')
    await wrapper.vm.$nextTick()
    
    // Set year
    const yearInput = wrapper.find('input[type="number"]')
    yearInput.element.value = '1492'
    await yearInput.trigger('input')
    await wrapper.vm.$nextTick()
    
    // Check the preview shows the formatted date with day
    expect(wrapper.text()).toContain('15 Hammer, 1492 DR')
  })

  it('clears date when none is selected', async () => {
    const wrapper = mount(HarptosDatePicker, {
      props: {
        modelValue: '15 Hammer, 1492 DR'
      }
    })
    
    await wrapper.vm.$nextTick()
    
    // Initially should show the date
    expect(wrapper.text()).toContain('15 Hammer, 1492 DR')
    
    // Select none
    await wrapper.find('input[value="none"]').setValue(true)
    await wrapper.vm.$nextTick()
    
    // Preview should not be visible when none is selected
    expect(wrapper.text()).not.toContain('Preview:')
  })

  it('shows all 12 months in dropdown', async () => {
    const wrapper = mount(HarptosDatePicker, {
      props: {
        modelValue: null
      }
    })
    
    // Select month-day type to show the fields
    await wrapper.find('input[value="month-day"]').setValue(true)
    await wrapper.vm.$nextTick()
    
    const monthSelect = wrapper.findAll('select')[1]
    const options = monthSelect.findAll('option')
    
    // Should have 13 options (1 empty + 12 months)
    expect(options.length).toBe(13)
    
    // Check some month names
    expect(options[1].text()).toContain('Hammer')
    expect(options[7].text()).toContain('Flamerule')
    expect(options[12].text()).toContain('Nightal')
  })

  it('shows days 1-30 in dropdown', async () => {
    const wrapper = mount(HarptosDatePicker, {
      props: {
        modelValue: null
      }
    })
    
    // Select month-day type to show the fields
    await wrapper.find('input[value="month-day"]').setValue(true)
    await wrapper.vm.$nextTick()
    
    const daySelect = wrapper.findAll('select')[0]
    const options = daySelect.findAll('option')
    
    // Should have 31 options (1 empty + 30 days)
    expect(options.length).toBe(31)
    expect(options[1].text()).toBe('1')
    expect(options[30].text()).toBe('30')
  })

  it('shows special days in dropdown', async () => {
    const wrapper = mount(HarptosDatePicker, {
      props: {
        modelValue: null
      }
    })
    
    // Select special day type
    await wrapper.find('input[value="special"]').setValue(true)
    await wrapper.vm.$nextTick()
    
    const specialSelect = wrapper.find('select')
    const options = specialSelect.findAll('option')
    
    // Should have special days including Midwinter, Greengrass, Midsummer, etc.
    expect(options.length).toBeGreaterThan(5)
    const optionTexts = options.map(o => o.text())
    expect(optionTexts).toContain('Midwinter')
    expect(optionTexts).toContain('Midsummer')
    expect(optionTexts).toContain('Greengrass')
  })

  it('filters out Shieldmeet in non-leap years', async () => {
    const wrapper = mount(HarptosDatePicker, {
      props: {
        modelValue: null
      }
    })
    
    // Select special day type
    await wrapper.find('input[value="special"]').setValue(true)
    await wrapper.vm.$nextTick()
    
    // Set a non-leap year (1493 is not divisible by 4)
    const yearInput = wrapper.find('input[type="number"]')
    await yearInput.setValue('1493')
    await wrapper.vm.$nextTick()
    
    const specialSelect = wrapper.find('select')
    const options = specialSelect.findAll('option')
    const optionTexts = options.map(o => o.text())
    
    // Shieldmeet should not appear
    expect(optionTexts).not.toContain('Shieldmeet')
  })

  it('shows Shieldmeet in leap years', async () => {
    const wrapper = mount(HarptosDatePicker, {
      props: {
        modelValue: null
      }
    })
    
    // Select special day type
    await wrapper.find('input[value="special"]').setValue(true)
    await wrapper.vm.$nextTick()
    
    // Set a leap year (1492 is divisible by 4)
    const yearInput = wrapper.find('input[type="number"]')
    await yearInput.setValue('1492')
    await wrapper.vm.$nextTick()
    
    const specialSelect = wrapper.find('select')
    const options = specialSelect.findAll('option')
    const optionTexts = options.map(o => o.text())
    
    // Shieldmeet should appear
    expect(optionTexts).toContain('Shieldmeet')
  })
})
