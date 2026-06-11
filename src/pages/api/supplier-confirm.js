import { withApi } from '../../lib/api'
import { supplierConfirmOrder } from '../../controllers/operations'

export default withApi(['POST'], supplierConfirmOrder)
