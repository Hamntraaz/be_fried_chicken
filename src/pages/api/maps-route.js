import { withApi } from '../../lib/api'
import { getMapsRoute } from '../../controllers/operations'

export default withApi(['POST'], getMapsRoute)
