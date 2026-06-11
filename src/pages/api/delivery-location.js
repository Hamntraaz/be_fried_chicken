import { withApi } from '../../lib/api'
import { updateDeliveryLocation } from '../../controllers/operations'

export default withApi(['POST'], updateDeliveryLocation)
