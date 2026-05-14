import { describe, expect, it } from 'vitest'
import { clientInput } from '#/lib/validators'

describe('clientInput validator', () => {
  const validInput = {
    name: 'Acme Inc.',
    email: 'billing@acme.com',
    address: '123 Main St',
    city: 'Springfield',
    postcode: '12345',
    country: 'US',
    phone: '+1 555 0100',
  }

  it('accepts valid input with all fields', () => {
    const result = clientInput.safeParse(validInput)
    expect(result.success).toBe(true)
  })

  it('accepts valid input with only required name field', () => {
    const result = clientInput.safeParse({ name: 'Acme Inc.' })
    expect(result.success).toBe(true)
  })

  it('accepts valid input with empty optional fields', () => {
    const result = clientInput.safeParse({
      ...validInput,
      email: '',
      address: '',
      city: '',
      postcode: '',
      country: '',
      phone: '',
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty name', () => {
    const result = clientInput.safeParse({
      ...validInput,
      name: '',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Contact name is required')
    }
  })

  it('rejects missing name', () => {
    const { name: _, ...withoutName } = validInput
    void _
    const result = clientInput.safeParse(withoutName)
    expect(result.success).toBe(false)
  })

  it('rejects name over 200 characters', () => {
    const result = clientInput.safeParse({
      ...validInput,
      name: 'A'.repeat(201),
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Name must be 200 characters or fewer')
    }
  })

  it('accepts name at exactly 200 characters', () => {
    const result = clientInput.safeParse({
      ...validInput,
      name: 'A'.repeat(200),
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = clientInput.safeParse({
      ...validInput,
      email: 'not-an-email',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Invalid email address')
    }
  })

  it('accepts valid email', () => {
    const result = clientInput.safeParse({
      ...validInput,
      email: 'test@example.com',
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty email', () => {
    const result = clientInput.safeParse({
      ...validInput,
      email: '',
    })
    expect(result.success).toBe(true)
  })

  it('rejects address over 500 characters', () => {
    const result = clientInput.safeParse({
      ...validInput,
      address: 'A'.repeat(501),
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Address must be 500 characters or fewer')
    }
  })

  it('rejects city over 100 characters', () => {
    const result = clientInput.safeParse({
      ...validInput,
      city: 'A'.repeat(101),
    })
    expect(result.success).toBe(false)
  })

  it('rejects postcode over 20 characters', () => {
    const result = clientInput.safeParse({
      ...validInput,
      postcode: 'A'.repeat(21),
    })
    expect(result.success).toBe(false)
  })

  it('rejects country over 100 characters', () => {
    const result = clientInput.safeParse({
      ...validInput,
      country: 'A'.repeat(101),
    })
    expect(result.success).toBe(false)
  })

  it('rejects phone over 30 characters', () => {
    const result = clientInput.safeParse({
      ...validInput,
      phone: '1'.repeat(31),
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Phone must be 30 characters or fewer')
    }
  })

  it('defaults optional fields when omitted', () => {
    const result = clientInput.safeParse({ name: 'Test Client' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual({
        name: 'Test Client',
        companyName: '',
        email: '',
        address: '',
        city: '',
        postcode: '',
        country: '',
        phone: '',
        notes: '',
      })
    }
  })
})
