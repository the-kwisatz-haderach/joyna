package auth

type User struct {
	Id                string `json:"id"`
	Name              string `json:"name"`
	Email             string `json:"email"`
	JoinedAt          string `json:"joinedAt"`
	ProfilePictureKey string `json:"profilePictureKey"`
}
