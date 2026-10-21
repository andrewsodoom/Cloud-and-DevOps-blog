import { useEffect } from 'react'
import { applySeo } from '../utils/seo'

export default function useSeo(settings, dependencies = []) {
  useEffect(() => {
    applySeo(settings)
  }, dependencies)
}
