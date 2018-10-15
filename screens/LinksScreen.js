import React from 'react';
import { View, Text, StyleSheet, Button, TouchableOpacity } from 'react-native';
import { Camera, Permissions, FileSystem, MediaLibrary } from 'expo';

export default class LinksScreen extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			noPermMessage: 'ViweShare needs access to your camera to work.',
			hasCameraPermission: null,
			hasCameraRollPermission: null,
			type: Camera.Constants.Type.back,
			openCamera: false,
			takenPhotoCount: 0
		};
	}

	async componentWillMount() {
		const { status } = await Permissions.askAsync(Permissions.CAMERA);
		const { status2 } = await Permissions.askAsync(Permissions.CAMERA_ROLL);
		this.setState({
			hasCameraPermission: status === 'granted',
			hasCameraRollPermission: status === 'granted'
		});
	}

	componentDidMount() {
		FileSystem.makeDirectoryAsync(
			FileSystem.documentDirectory + 'photos'
		).catch(e => {
			return null;
		});
	}

	static navigationOptions = {
		title: 'Links'
	};

	openCamera() {
		if (this.state.openCamera) {
			return 'Camera Opened';
		} else {
			return 'Camera Not Opened';
		}
	}

	// Change! Make sure we use await so this makes more sense...
	takeManyPictures = () => {
		for (let i = 1; i < 6; i++) {
			setTimeout(() => {
				this.takePicture();
			}, 1500 * i);
		}
	};

	async takePicture() {
		console.log(`Camera: ${this.camera}`);
		if (this.camera) {
			// this.camera.takePictureAsync({ onPictureSaved: this.onPictureSaved });
			this.setState({ takenPhotoCount: ++this.state.takenPhotoCount });
			const { uri } = await this.camera.takePictureAsync();
			const asset = await MediaLibrary.createAssetAsync(uri);
		}
	}

	onPictureSaved = async photo => {
		console.log(
			`Moved to: ${FileSystem.documentDirectory}photos/${Date.now()}.jpg`
		);
		await FileSystem.moveAsync({
			from: photo.uri,
			to: `${FileSystem.documentDirectory}photos/${Date.now()}.jpg`
		});
		this.setState({ newPhotos: true });
	};

	render() {
		const { hasCameraPermission } = this.state;
		if (!hasCameraPermission) {
			return (
				<View>
					<Text>{this.state.noPermMessage}</Text>
				</View>
			);
		}

		if (this.state.openCamera) {
			return (
				<View style={{ flex: 1 }}>
					<Camera
						style={{ flex: 1 }}
						type={this.state.type}
						ref={ref => {
							this.camera = ref;
						}}
					>
						<View
							style={{
								flex: 1,
								backgroundColor: 'transparent',
								flexDirection: 'column'
							}}
						>
							<View
								stlye={{
									flex: 0.4,
									alignSelf: 'flex-start'
								}}
							>
								<Text style={styles.photoTakenText}>
									Photos Taken: {this.state.takenPhotoCount}
								</Text>
							</View>
							<View
								style={{
									alignSelf: 'flex-end',
									flex: 1,
									flexDirection: 'row'
								}}
							>
								<TouchableOpacity
									style={{
										flex: 0.2,
										alignSelf: 'flex-end'
									}}
									onPress={() => {
										this.setState({
											type:
												this.state.type === Camera.Constants.Type.back
													? Camera.Constants.Type.front
													: Camera.Constants.Type.back
										});
									}}
								>
									<Text
										style={{ fontSize: 18, marginBottom: 10, color: 'white' }}
									>
										{' '}
										Flip{' '}
									</Text>
								</TouchableOpacity>
								<TouchableOpacity
									style={{
										flex: 0.5,
										alignSelf: 'flex-end',
										alignItems: 'center'
									}}
									onPress={() => {
										this.takeManyPictures();
									}}
								>
									<Text
										style={{ fontSize: 18, marginBottom: 10, color: 'white' }}
									>
										{' '}
										Take Photos{' '}
									</Text>
								</TouchableOpacity>
							</View>
						</View>
					</Camera>
				</View>
			);
		}

		return (
			<View style={styles.container}>
				<Text style={styles.centeredText}>
					Hurray! You gave us camera permission!\n ({this.openCamera()})
				</Text>
				<View style={styles.container}>
					<Button
						onPress={() => {
							this.setState({ openCamera: true });
						}}
						title="Open Camera"
					/>
				</View>
			</View>
		);
	}
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		paddingTop: 35,
		paddingBottom: 15,
		backgroundColor: '#fff'
	},

	centeredText: {
		fontSize: 14,
		color: '#A9A9A9',
		textAlign: 'center'
	},

	photoTakenText: {
		color: '#ADD8E6',
		fontSize: 24
	}
});
