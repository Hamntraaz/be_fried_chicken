import { withApi } from '../../lib/api'
import { recordProductionUsage } from '../../controllers/operations'

export default withApi(['POST'], recordProductionUsage)
