import { withApi } from '../../lib/api'
import { updateOrderStatus } from '../../controllers/operations'

export default withApi(['POST'], updateOrderStatus)
