import { setSymbolSource } from './money'

export type CurrencySym = '$' | '¥' | '€' | '£'

export const CURRENCIES: [CurrencySym, string][] = [
  ['$', '美元'],
  ['¥', '日元 / 人民币'],
  ['€', '欧元'],
  ['£', '英镑'],
]

const KEY = 'spitbill-currency'

export const currency = $state({
  sym: ((localStorage.getItem(KEY) as CurrencySym) || '$') as CurrencySym,
})

export function setCurrency(s: CurrencySym) {
  currency.sym = s
  localStorage.setItem(KEY, s)
}

setSymbolSource(() => currency.sym)
