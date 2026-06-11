import { withApi } from '../../lib/api'
import { upsertMaterial } from '../../controllers/operations'

export default withApi(['POST'], upsertMaterial)
