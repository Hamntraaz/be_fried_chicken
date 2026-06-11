import { withApi } from '../../lib/api'
import { deliveryComplete } from '../../controllers/operations'

export default withApi(['POST'], deliveryComplete)
