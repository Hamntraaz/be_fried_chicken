import { withApi } from '../../lib/api'
import { courierTaskResponse } from '../../controllers/operations'

export default withApi(['POST'], courierTaskResponse)
