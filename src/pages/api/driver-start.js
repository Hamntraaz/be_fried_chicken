import { withApi } from '../../lib/api'
import { driverStart } from '../../controllers/operations'

export default withApi(['POST'], driverStart)
