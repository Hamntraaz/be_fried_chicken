import { withApi } from '../../lib/api'
import { receiveOrder } from '../../controllers/operations'

export default withApi(['POST'], receiveOrder)
