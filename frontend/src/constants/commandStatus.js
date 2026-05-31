export const COMMAND_STATUSES = [
  { value: 'Pending', label: 'Pending' },
  { value: 'Accepted', label: 'Accepted' },
  { value: 'In_Design', label: 'In Design' },
  { value: 'Prototyping', label: 'Prototyping' },
  { value: 'Testing', label: 'Testing' },
  { value: 'Shipped', label: 'Shipped' },
]

export const PAYMENT_STATUSES = [
  { value: 'none', label: 'None' },
  { value: 'pending', label: 'Pending payment' },
  { value: 'paid', label: 'Paid' },
  { value: 'waived', label: 'Waived' },
]

export function statusLabel(value) {
  return COMMAND_STATUSES.find((s) => s.value === value)?.label || value
}

export function paymentStatusLabel(value) {
  return PAYMENT_STATUSES.find((s) => s.value === value)?.label || value
}
