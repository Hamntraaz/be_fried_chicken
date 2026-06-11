import { withApi, ok } from '../../lib/api'

export default withApi(['GET'], async () => ok({ success: true, ok: true, message: 'Backend Rafiza aktif' }))
