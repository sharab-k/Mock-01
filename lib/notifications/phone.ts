// Parents' numbers are stored the way families write them ("0300 1234567",
// "0300-1234567", sometimes "+92…"), but Twilio only accepts E.164
// ("+923001234567") — a raw "03001234567" is rejected outright, WhatsApp and
// SMS alike. Pure and I/O-free so it can be unit tested.
export function toE164(raw: string | null | undefined, defaultCountry = '92'): string | null {
  if (!raw) return null
  let s = raw.trim().replace(/[\s\-().]/g, '')
  if (s.startsWith('00')) s = `+${s.slice(2)}`

  if (s.startsWith('+')) {
    const digits = s.slice(1)
    return /^\d{8,15}$/.test(digits) ? `+${digits}` : null
  }
  if (!/^\d+$/.test(s)) return null

  if (s.startsWith('0')) s = s.slice(1) // national trunk prefix: 0300… -> 300…
  else if (s.startsWith(defaultCountry) && s.length >= defaultCountry.length + 9) s = s.slice(defaultCountry.length) // 92300…

  // Pakistani mobiles are 3XXXXXXXXX (10 digits after the country code).
  if (defaultCountry === '92' && !/^3\d{9}$/.test(s)) return /^\d{9,10}$/.test(s) ? `+${defaultCountry}${s}` : null
  return `+${defaultCountry}${s}`
}
