import { withApi } from '../../lib/api'
import { saveActorLocation } from '../../controllers/operations'

export default withApi(['POST'], saveActorLocation)
