import { withApi } from '../../lib/api'
import { updateManagedAccountStatus } from '../../controllers/operations'

export default withApi(['POST'], updateManagedAccountStatus)
