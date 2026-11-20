import { describe, expect, it, vi } from 'vitest'
import {
  createTracesSampler,
  DEFAULT_TRACES_SAMPLE_RATE,
  parseTracesSampleRate,
  sentryInitOptions,
} from './sentry.ts'

type Sampler = ReturnType<typeof createTracesSampler>
type SamplingContext = Parameters<Sampler>[0]

/** v11 서버 span이 tracesSampler에 넘기는 모양(이름은 메서드뿐, 경로는 url.path) */
function sample(sampler: Sampler, path: string, parent?: { sampled: boolean; rate?: number }) {
  const context = {
    name: 'GET',
    attributes: { 'sentry.op': 'http.server', 'url.path': path },
    parentSampled: parent?.sampled,
    parentSampleRate: parent?.rate,
    inheritOrSampleWith: (fallback: number) => {
      if (typeof parent?.rate === 'number') return parent.rate
      if (typeof parent?.sampled === 'boolean') return Number(parent.sampled)
      return fallback
    },
  } as unknown as SamplingContext
  return sampler(context)
}

describe('tracesSampler', () => {
  it('A8: /health는 트레이스하지 않는다(브라우저 트레이스가 이어져도)', () => {
    const sampler = createTracesSampler(1)
    expect(sample(sampler, '/health')).toBe(0)
    expect(sample(sampler, '/health', { sampled: true, rate: 1 })).toBe(0)
  })

  it('A9: env가 없으면 운영에서도 기본값 1.0으로 남긴다', () => {
    const { tracesSampler } = sentryInitOptions({ NODE_ENV: 'production' })
    expect(DEFAULT_TRACES_SAMPLE_RATE).toBe(1)
    expect(sample(tracesSampler as Sampler, '/api/v1/products/12')).toBe(1)
  })

  it('A10: SENTRY_TRACES_SAMPLE_RATE=0.2면 0.2', () => {
    const { tracesSampler } = sentryInitOptions({
      NODE_ENV: 'production',
      SENTRY_TRACES_SAMPLE_RATE: '0.2',
    })
    expect(sample(tracesSampler as Sampler, '/api/v1/products/12')).toBe(0.2)
  })

  it('브라우저가 보낸 트레이스는 프론트의 샘플링 결정을 따른다', () => {
    const sampler = createTracesSampler(1)
    expect(sample(sampler, '/api/v1/products/12', { sampled: false, rate: 0.1 })).toBe(0.1)
  })
})

describe('SENTRY_TRACES_SAMPLE_RATE', () => {
  it.each(['abc', '2', '-0.1', 'NaN'])(
    'A11: "%s"는 경고하고 기본값을 쓴다(시작은 막지 않는다)',
    (raw) => {
      const warn = vi.fn()
      expect(parseTracesSampleRate(raw, warn)).toBe(DEFAULT_TRACES_SAMPLE_RATE)
      expect(warn).toHaveBeenCalledOnce()
      expect(warn.mock.calls[0]?.[0]).toContain(raw)
    },
  )

  it.each([
    [undefined, 1],
    ['', 1],
    ['0', 0],
    ['1', 1],
    [' 0.5 ', 0.5],
  ])('"%s" → %s (경고 없음)', (raw, expected) => {
    const warn = vi.fn()
    expect(parseTracesSampleRate(raw, warn)).toBe(expected)
    expect(warn).not.toHaveBeenCalled()
  })
})

describe('release', () => {
  it('A12: SENTRY_RELEASE를 release로 쓴다', () => {
    const sha = '22c00ee8f3b1c2d4e5f60718293a4b5c6d7e8f90'
    expect(sentryInitOptions({ SENTRY_RELEASE: sha }).release).toBe(sha)
  })

  it('A13: SENTRY_RELEASE가 없거나 비어 있으면 release 없이 시작한다', () => {
    expect(sentryInitOptions({}).release).toBeUndefined()
    expect(sentryInitOptions({ SENTRY_RELEASE: '' }).release).toBeUndefined()
  })
})
