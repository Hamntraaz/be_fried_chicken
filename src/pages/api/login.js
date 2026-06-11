import { withApi } from '../../lib/api'
import { login } from '../../controllers/operations'

export default withApi(['POST'], login)
