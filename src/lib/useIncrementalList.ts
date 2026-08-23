import { useEffect, useRef, useState } from 'react'

/**
 * 增量渲染长列表：首屏只出 pageSize 条，剩下的交给 IntersectionObserver 在临近视口时
 * 自动续加载（rootMargin 600px 提前量，滚动不卡顿）。
 *
 * 与「结果网格」配合：筛选 / 搜索变化时 items 引用会变，这里自动把 count 归零回首页大小，
 * 避免「切到 3 页后换个关键词却还停在中间」的断层感。列表比 pageSize 短时不渲染哨兵、不触发加载。
 */
export function useIncrementalList<T>(items: T[], pageSize = 24) {
  const [count, setCount] = useState(pageSize)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // 列表变化（筛选 / 搜索 / 上传）时回到首页大小
  useEffect(() => {
    setCount(pageSize)
  }, [items, pageSize])

  // 哨兵临近视口就续加一页
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setCount((c) => Math.min(c + pageSize, items.length))
        }
      },
      { rootMargin: '600px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [items.length, pageSize])

  return {
    visible: items.slice(0, count),
    sentinelRef,
    hasMore: count < items.length,
  }
}
