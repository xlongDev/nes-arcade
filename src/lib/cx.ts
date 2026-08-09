type ClassValue = string | number | false | null | undefined

/** 极简 className 拼接。为了一个 200 字节的功能引 clsx 不划算。 */
export function cx(...values: ClassValue[]): string {
  let out = ''
  for (const v of values) {
    if (!v) continue
    out = out ? `${out} ${v}` : String(v)
  }
  return out
}
