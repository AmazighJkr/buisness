export const COMMAND_STATUSES = [
  { value: 'Pending', label: 'Pending' },
  { value: 'In_Design', label: 'In Design' },
  { value: 'Prototyping', label: 'Prototyping' },
  { value: 'Testing', label: 'Testing' },
  { value: 'Shipped', label: 'Shipped' },
]

export function statusLabel(value) {
  return COMMAND_STATUSES.find((s) => s.value === value)?.label || value
}
