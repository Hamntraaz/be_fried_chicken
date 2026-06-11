import { withApi } from '../../lib/api'
import { driverArrived } from '../../controllers/operations'

export default withApi(['POST'], driverArrived)
