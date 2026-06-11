import { withApi } from '../../lib/api'
import { updateCourierStatus } from '../../controllers/operations'

export default withApi(['POST'], updateCourierStatus)
