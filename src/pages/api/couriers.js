import { withApi } from '../../lib/api'
import { createCourier } from '../../controllers/operations'

export default withApi(['POST'], createCourier)
