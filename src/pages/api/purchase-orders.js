import { withApi } from '../../lib/api'
import { createPurchaseOrder } from '../../controllers/operations'

export default withApi(['POST'], createPurchaseOrder)
