import { withApi } from '../../lib/api'
import { getOverview } from '../../controllers/operations'

export default withApi(['GET'], getOverview)
