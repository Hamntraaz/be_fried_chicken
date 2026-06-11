import { withApi } from '../../lib/api'
import { assignCourier } from '../../controllers/operations'

export default withApi(['POST'], assignCourier)
